const multer = require("multer");

class FormDataParserService {
    constructor() {
        this.logger = console; // Replace with a logger like Winston if needed
    }

    parseNestedFormData(data, files) {
        this.logger.info("Parsing nested form data");
        const result = {};

        // Process regular form data
        for (const key of Object.keys(data)) {
            this.assignNested(result, key, data[key]);
        }

        // Process file data
        if (files) {
            return files;
            // for (const field in files) {
            //     if (Object.prototype.hasOwnProperty.call(files, field)) {
            //         const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
            //         fileArray.forEach((file) => {
            //             const key = file.fieldname; // Use the fieldname as the key
            //             this.assignNested(result, key, file);
            //         });
            //     }
            // }
        }

        this.convertObjectToArray(result);
        this.convertStringifiedArrays(result);
        this.logger.info("Form data parsed successfully");
        return result;
    }

    convertObjectToArray(obj) {
        Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === "object" && obj[key] !== null) {
                if (Object.keys(obj[key]).every((k) => !isNaN(parseInt(k)))) {
                    obj[key] = Object.values(obj[key]);
                }
                this.convertObjectToArray(obj[key]);
            }
        });
    }

    convertStringifiedArrays(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === "string") {
                    try {
                        const parsedValue = JSON.parse(obj[key]);
                        if (parsedValue && typeof parsedValue === "object") {
                            obj[key] = parsedValue;
                        }
                    } catch (error) {}
                } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                    this.convertStringifiedArrays(obj[key]);
                } else if (Array.isArray(obj[key])) {
                    obj[key].forEach((item, index) => {
                        if (typeof item === "string") {
                            try {
                                const parsedItem = JSON.parse(item);
                                if (parsedItem && typeof parsedItem === "object") {
                                    obj[key][index] = parsedItem;
                                    this.convertStringifiedArrays(parsedItem);
                                }
                            } catch (error) {}
                        } else if (typeof item === "object" && !Array.isArray(item)) {
                            this.convertStringifiedArrays(item);
                        }
                    });
                }
            }
        }
    }

    assignNested(obj, key, value) {
        this.logger.info("Assigning nested value", { key, value });
        const keys = key.split(".");
        let temp = obj;

        while (keys.length > 1) {
            const k = keys.shift();
            if (!temp[k]) temp[k] = {};
            temp = temp[k];
        }
        if (typeof temp[keys[0]] === "object" && !Array.isArray(temp[keys[0]]) && !(value instanceof Buffer)) {
            temp[keys[0]] = { ...temp[keys[0]], ...value };
        } else {
            temp[keys[0]] = value;
        }
        this.logger.info("Nested value assigned", { key, value });
    }
}

// Multer Configuration
const storage = multer.diskStorage({
    destination: "./uploads", // Change the path as needed
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

module.exports = { FormDataParserService, upload };
