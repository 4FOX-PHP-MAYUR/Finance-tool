const multer = require("multer");
const { FormDataParserService } = require("../controllers/common/form.data.parser.service"); // Adjust the path as needed

const upload = multer(); // Multer middleware instance
const formDataParserService = new FormDataParserService(); // Instantiate service

const formDataParserMiddleware = async (req, res, next) => {
    try {
        if (req.headers["content-type"] && !req.headers["content-type"].includes("application/json")) {
            await new Promise((resolve, reject) => {
                upload.any()(req, res, (err) => {
                    if (err) return reject(err);
                    try {
                        const body = req.body;
                        const files = req.files;
                        req.body = formDataParserService.parseNestedFormData(body, files);
                        resolve();
                    } catch (error) {
                        console.error("Error parsing form data:", error);
                        reject(error);
                    }
                });
            });
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { formDataParserMiddleware };
