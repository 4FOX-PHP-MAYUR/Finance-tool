const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const CatchAsyncErrors = require("../../middlewares/catch.async.errors.middleware");

const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../startup/commonModules");
const UserModel = db.user;
const { validateUser } = require("../../validations/admin.validation");
const validator = require("validator");
const { normalizeUserEmail, EMAIL_LOOKUP_COLLATION } = require("../../utils/normalizeEmail");

async function resolveRoleIdForToken(userDoc) {
  if (!userDoc?._id) return null;
  // User model uses autopopulate on roleId, which may replace ObjectId with an object
  // containing only roleName. Always fetch a raw roleId for JWT payload.
  const fresh = await UserModel.findById(userDoc._id)
    .select("roleId")
    .setOptions({ autopopulate: false })
    .lean();
  return fresh?.roleId || null;
}

exports.addAdmin = async (req, res) => {
  try {
    const user = await UserModel.create(req.body);
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.getAllUser = async (req, res) => {
  try {
    const allData = await UserModel.find();
    res.status(200).json(allData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
/* exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Find the user by email
		const user = await UserModel.findOne({ email: email });
		if (!user) {
			return res.status(401).json(c_error("Invalid email", res.statusCode));
		}

		// Check if the password is correct
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json(c_error(msgConf.auth.loginFailed, res.statusCode));
		}

		// Create a JWT token
		const token = jwt.sign(
			{ userId: user._id, roleId: user.roleId },
			process.env.JWT_TOKEN_KEY, 
			{ expiresIn: '1h' }
		);

		return res.status(200).json(c_success(msgConf.success, c_results(msgConf.auth.loginSuccess, { user, token }), res.statusCode));
	    
	} catch (err) {
		return res.status(500).json(c_error(err.message || msgConf.auth.loginFailed, res.statusCode));
	}
};

exports.loginNew = async (req,res)=>{
	const { email, password ,role} = req.body;

	// Checks if email or password is entered by user
	if(!email || !password) {
		res
		.status(401)
		.json({
			success : false,
			message : 'Please enter E-mail or Password.'
		});
		return;
	}

	// Finding user in database
	const user = await UserModel.findOne({email,role,"isDelete":0}).select('+password');
	//console.log(user)
	if(!user) {
		res
			.status(404)
			.json({
				success : false,
				message : 'No record found with this E-mail.'
			});
		return;
	}

	if(!user.isActive) {
		res
			.status(404)
			.json({
				success : false,
				message : 'Please contact admin for login.'
			});
		return;
	}

	// Check if password is correct
	const isPasswordMatched = await user.comparePassword(password);

	if(!isPasswordMatched) {
		//return next(new ErrorHandler('Invalid Email or Password', 401));
		 res
		.status(401)
		.json({
			success : false,
			message : 'Invalid E-mail or Password.'
		});
		return;
	}
	let msg = "User logged in successfully";
} */

exports.login = async (req, res, next) => {
  try {
    console.log("Req.Body",req.body);
    const { error, value } = validateUser(req.body);
    if (error) {
      return res
        .status(400)
        .json(c_error(error.details[0].message, res.statusCode));
    }
    const { email, password, role } = value;
    // Finding user in database (collation matches legacy mixed-case emails)
    const user = await UserModel.findOne({ email, isDeleted: false })
      .collation(EMAIL_LOOKUP_COLLATION)
      .select("+password");


    if (!user) {
      return res
        .status(401)
        .json(c_error(msgConf.auth.validation.userNotFound, res.statusCode));
    }

    if (!user.isActive) {
      return res
        .status(400)
        .json(c_error(msgConf.auth.validation.userInactive, res.statusCode));
    }

    // Check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return res
        .status(401)
        .json(c_error(msgConf.auth.validation.loginFailed, res.statusCode));
    }

    // Create a JWT token
    const roleIdForToken = await resolveRoleIdForToken(user);
    const token = jwt.sign(
      { userId: user._id, roleId: roleIdForToken },
      process.env.JWT_TOKEN_KEY,
      { expiresIn: process.env.JWT_EXPIRES_TIME }
    );

    // Audit log — LOGIN action
    const { createLog } = require('../../services/log.service');
    await createLog({
      userId: user._id,
      role: String(user.roleId),
      action: 'LOGIN',
      module: 'users',
      recordId: user._id,
      description: `User logged in: ${user.email}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
    });

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.auth.loginSuccess, { user, token }),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`login ${err.message}`);
    res
      .status(500)
      .json(c_error(err.message || msgConf.auth.loginFailed, res.statusCode));
  }
};
exports.me = async (req, res, next) => {
  try {
    const menus = [
      {
        label: "Config",
        icon: "FaTools",
        to: "/config",
        tooltip: "Config",
        active: 'location.pathname.startsWith("/config")',
        isActive: true,
      },
      {
        label: "About Us",
        icon: "FaUserTie",
        tooltip: "About Us",
        isActive: true,
        submenu: [
          {
            to: "/about-us/team",
            label: "Our Team",
            isActive: true,
          },
          {
            to: "/about-us/how-we-do",
            label: "How We Do It",
            isActive: true,
          },
          {
            to: "/about-us/offices",
            label: "Offices",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/about-us")',
      },
      {
        label: "What we do",
        icon: "FaCogs",
        tooltip: "What we do",
        isActive: true,
        submenu: [
          {
            to: "/whatWeDo/whatWeDo-list",
            label: "Services",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/whatWeDo")',
      },
      {
        label: "Our Work",
        icon: "FaBriefcase",
        tooltip: "Our Work",
        isActive: true,
        submenu: [
          {
            to: "/ourwork/ourwork-category",
            label: "Our Work Category",
            isActive: true,
          },
          {
            to: "/ourwork/ourwork-listing",
            label: "Our Work Listing",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/ourwork")',
      },
      {
        label: "Podcasts",
        icon: "FaPodcast",
        tooltip: "Podcasts",
        isActive: true,
        submenu: [
          {
            to: "/podcast/podcast-listing",
            label: "Podcasts Listing",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/podcast")',
      },
      {
        label: "Influencers",
        icon: "FaBullhorn",
        tooltip: "Influencers",
        isActive: true,
        submenu: [
          {
            to: "/influencer/influencer-form",
            label: "Influencer Detail",
            isActive: true,
          },
          {
            to: "/influencer/creators-listing",
            label: "Content Creators",
            isActive: true,
          },
          {
            to: "/influencer/campaign-listing",
            label: "Campaign & Results",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/influencer")',
      },
      {
        label: "Our Partners",
        icon: "FaHandshake",
        tooltip: "Our Partners",
        isActive: true,
        submenu: [
          {
            to: "/partner/partner-listing",
            label: "Partner List",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/partner")',
      },
      {
        label: "Our Clients",
        icon: "FaUsers",
        tooltip: "Our Clients",
        isActive: true,
        submenu: [
          {
            to: "/client/client-listing",
            label: "Client List",
            isActive: true,
          },
        ],
        active: 'location.pathname.startsWith("/client")',
      },
      {
        label: "Role",
        icon: "FaChalkboardTeacher",
        tooltip: "Role",
        isActive: true,
        submenu: [
          {
            to: "/role/role-creation-form",
            label: "Role Creation Form",
            isActive: true,
          },
        ],
      },
      {
        label: "Blogs",
        icon: "FaBlog",
        tooltip: "Blogs",
        isActive: false,
        submenu: [
          {
            to: "/blog-list",
            label: "Blog List",
            isActive: false,
          },
        ],
        active: 'location.pathname.startsWith("/blog")',
      },
    ];

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.auth.loginSuccess, menus),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`login ${err.message}`);
    res
      .status(500)
      .json(c_error(err.message || msgConf.auth.profileFailed, res.statusCode));
  }
};

exports.createUser = async (req, res) => {
  const { email, mobileNumber } = req.body;
  const emailNorm = normalizeUserEmail(email);
  if (!emailNorm || !validator.isEmail(emailNorm)) {
    return res.status(400).json(c_error("Invalid email", res.statusCode));
  }
  const roleId = String(req.body?.roleId || "").trim();

  const existingUser = await UserModel.findOne({
    $or: [{ email: emailNorm }, { mobileNumber }],
  }).collation(EMAIL_LOOKUP_COLLATION);
  if (existingUser) {
    return res
      .status(400)
      .json(c_error(`Email or Mobile already exists`, res.statusCode));
  }

  const mongoose = require("mongoose");
  const payload = { ...req.body, email: emailNorm };
  if (roleId) {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res
        .status(400)
        .json(c_error("Invalid roleId", res.statusCode));
    }
    payload.roleId = new mongoose.Types.ObjectId(roleId);
  } else {
    // Ensure required field is sent explicitly
    return res
      .status(400)
      .json(c_error("roleId is required", res.statusCode));
  }

  const user = await UserModel.create(payload);

  if (user) {
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("User created successfully", user),
          res.statusCode
        )
      );
  }
};

// POST /api/auth/logout  — Invalidate session & log the action
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const roleId  = req.user.roleId || req.user.role || 'unknown';

    const { createLog } = require('../../services/log.service');

    await createLog({
      userId,
      role: String(roleId),
      action: 'LOGOUT',
      module: 'users',
      recordId: userId,
      description: 'User logged out',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
    });

    return res
      .status(200)
      .json(c_success(msgConf.success, c_results('Logged out successfully', {}), res.statusCode));
  } catch (err) {
    logger.error(`logout ${err.message}`);
    return res.status(500).json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

exports.createUserOld = CatchAsyncErrors(async (req, res, next) => {
  let firstName = "Admin1";
  let lastName = "Admin1";
  const user1 = await UserModel.create({
    firstName,
    lastName,
    email: "admin1@4fox.com",
    mobileNumber: "3455454546",
    password: "Magnitude#2025",
    role: "admin",
    roleId: "66a4c10fe1aa712405da1e70",
  });
});
