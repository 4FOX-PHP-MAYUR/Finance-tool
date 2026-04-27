const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config();


const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
require('./models/index');
const path = require('path');
const cors = require('cors');
const errorMiddleware = require('./middlewares/errors.middleware');
const swaggerUI = require('swagger-ui-express') ;
const swaggerJsDoc = require('swagger-jsdoc');
const faqCategorySwaggerDoc = require('./swagger/faq/faq.category.swagger');
const faqSwaggerDoc = require('./swagger/faq/faq.swagger');
const { exec } = require('child_process');



require('./startup/crons');


const options = {
  definition:{
    openapi :"3.0.0",
    info:{
      title :"Finance tool API",
      version : '1.0.0',
      description : 'Finance tool REST APIs'
    },
  
    servers :[
      {
        url : "http://localhost:3200"
      }
    ],
    paths: {
      ...faqCategorySwaggerDoc.paths,
      ...faqSwaggerDoc.paths,
    },
    components: {
      schemas: {
        ...faqCategorySwaggerDoc.components?.schemas,
        ...faqSwaggerDoc.components?.schemas,
      },
      responses: {
        ...faqCategorySwaggerDoc.components?.responses,
        ...faqSwaggerDoc.components?.responses,
      },
      // You can add more components here if needed
    }
    

  },
  apis :["./routes/*.js"]
}
const specs = swaggerJsDoc(options);

const app = express();
app.set('trust proxy', true);
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(specs))
// app.use(cors({origin:'http://localhost:3001',credentials: true}));


/* const mongoString = process.env.DATABASE_URL
mongoose.connect(mongoString);
const database = mongoose.connection
ß
database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
}) */

app.use(express.json());
app.use(bodyParser.json());

app.use(cors ({
    origin: 
    "*"
    }));
  

//app.use('/api', routes)
const logger = require("./startup/logging");
if (app.get("env") === "development") {
  logger.info("Running in dev mode");
    app.use(
      morgan('combined')
    );
  }

  app.use(helmet());
  app.use(compression());
  // Middleware to handle errors
  app.use(errorMiddleware);
app.use((req, res, next) => {
   res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'self' http://localhost:3000","http://localhost:6001");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});


// Image serving route


require("./startup/routes")(app);

app.get('/hello',(req,res)=>{
    res.send("hi mongo");

})



const BACKUP_PATH = path.join(__dirname, 'db_backups');
const MONGO_URI = require('./config/mongoUri');


const fs = require('fs');
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
}


app.get('/backup', (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(BACKUP_PATH, `backup-${timestamp}`);

  const command = `mongodump --uri="${MONGO_URI}" --out="${outputDir}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`Backup completed: ${stdout}`);
    return res.json({ success: true, message: 'Backup completed', path: outputDir });
  });
});



app.listen(process.env.PORT, () => {
  console.log(`Server Started at ${process.env.PORT}`);
    logger.info(`Server Started at ${process.env.PORT}`)
})