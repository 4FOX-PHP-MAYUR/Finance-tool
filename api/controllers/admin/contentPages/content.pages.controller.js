
const { c_success, c_error, c_results, db, msgConf,logger } = require("../../../startup/commonModules");
const { validateContentPage } = require('../../../validations/admin.validation');
const ContentPages = db.contentPages;



exports.addContent = async (req, res) => {
    try {
        const { error, value } = validateContentPage(req.body);
        if (error) {
            return res.status(400).json(c_error(error.details[0].message, res.statusCode));
        }
        const {type} = value;
        const isExists = await ContentPages.findOne({ type : type });
        if (isExists) {
            const data = await ContentPages.findByIdAndUpdate(isExists._id, req.body, { new: true });
            return res.status(200)
            .json(c_success(msgConf.success, c_results(msgConf.contentPages.contentUpdated, data), res.statusCode));
            
        }
        value.updatedBy = req.user.userId;
        value.createdBy = req.user.userId;
       
        const data = await ContentPages.create(value);
        if (!data) {
            return res.status(400).json(c_error(msgConf.contentPages.contentCreationFailed, res.statusCode));

        }
        
        return res.status(201)
            .json(c_success(msgConf.success, c_results(msgConf.contentPages.contentCreated, data), res.statusCode));

    } catch (err) {
        logger.error(`addContent ${err.message}`);
        res
            .status(500)
            .json(c_error(err.message || msgConf.contentPages.contentCreationFailed, res.statusCode));
    }

}
exports.updateContent = async (req, res) => {
    try {
        const { contentId } = req.params;
        if (!contentId) {
            return res.status(400).json(c_error(msgConf.contentPages.validation.contentIdRequired, res.statusCode));
        }
        const { title,type } = req.body;
        const isExists = await ContentPages.findOne({
            title: title,
            type : type,
            _id: { $ne: contentId }
        });

        if (isExists) {
            return res.status(400).json(c_error(`${title} ${msgConf.contentPages.validation.contentExists}`, res.statusCode));
        }
        const data = await ContentPages.findByIdAndUpdate(contentId, req.body, { new: true });
        if (!data) {
            return res.status(400).json(c_error(msgConf.contentPages.validation.contentIdNotFound, res.statusCode));
        }
        return res.status(200)
            .json(c_success(msgConf.success, c_results(msgConf.contentPages.contentUpdated, data), res.statusCode));

    } catch (err) {
        logger.error(`updateFaq ${err.message}`);
        res
            .status(500)
            .json(c_error(err.message || msgConf.contentPages.contentUpdateFailed, res.statusCode));
    }

}
exports.getAllContent = async (req, res) => {

    try {
        const data = await ContentPages.find({isDeleted : false});
        if (!data) {
            return res.status(400).json(c_error(msgConf.contentPages.faqFetchFailedfe, res.statusCode));
        }
        return res.status(200)
            .json(c_success(msgConf.success, c_results(msgConf.contentPages.contentFetchSuccess, data), res.statusCode));

    } catch (err) {
        logger.error(`getAllBlogs ${err.message}`);
        res
            .status(500)
            .json(c_error(err.message || msgConf.contentPages.faqFetchFailed, res.statusCode));
    }

}
exports.getContentByType = async (req, res) => {

    try {
        const { type } = req.params;
        const data = await ContentPages.findOne({isDeleted : false,type : type});
        if (!data) {
            return res.status(400).json(c_error(msgConf.contentPages.contentFetchFailed, res.statusCode));
        }
        return res.status(200)
            .json(c_success(msgConf.success, c_results(msgConf.contentPages.contentFetchSuccess, data), res.statusCode));

    } catch (err) {
        logger.error(`getContentByType ${err.message}`);
        res
            .status(500)
            .json(c_error(err.message || msgConf.contentPages.contentFetchFailed, res.statusCode));
    }

}

