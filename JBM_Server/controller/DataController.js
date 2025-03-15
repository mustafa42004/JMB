module.exports = (io) => {

  const route = require('express').Router();
  const { v4: uuidv4 } = require('uuid');
  const dataModel = require('../model/addDataSchema');
  const path = require('path');
  const fs = require('fs');
  const xlsx = require('xlsx');
  const csv = require('csv-parser');
  const { exec } = require('child_process');
  require('dotenv').config(); 
  const winston = require('winston')
  require('dotenv').config();
const multerS3 = require('multer-s3');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// ---------------------------------File Reading-----------------------------------------

// Function to read XLSX files
function readXLSXFile(filePath, name) {
  console.log("i am error", filePath, name)
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assuming we want the first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet); // Converts to JSON format

  return data; // Array of objects
}

// Function to read CSV files
function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results); // Return all data rows as an array of objects
      })
      .on('error', (error) => reject(error));
  });
}

// ---------------------------------File Reading-----------------------------------------

//-------------------------File Saving------------------------------------


// AWS SDK Configuration
const s3 = new S3Client({
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Directory to store uploaded files temporarily
const uploadDir = path.join(__dirname, "..", 'assets', 'uploads');

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file storage
const storage = multerS3({
  s3: s3,
  bucket: 'jmb-enterprises-bucket',
  // acl: 'public-read',
  key: (req, file, cb) => {
    // Generate a unique name for the file
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

// Configure winston for logging (optional)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: 'upload-errors.log' }) // Log errors to a file
  ],
});

// Multer instance with limits and file type filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limit to 10MB
  fileFilter: (req, file, cb) => {
    // Allow only .xlsx and .csv file types
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'text/csv' // CSV
    ];

    // Log the incoming file type
    logger.info(`Incoming file type: ${file.mimetype} for file: ${file.originalname}`);

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      logger.error(`Invalid file type: ${file.mimetype} for file: ${file.originalname}`);
      cb(new Error('Invalid file type'), false);
    }
  }
});


//-------------------------File Saving------------------------------------

//-------------------To add the FILENAME and ACTION property in the file using python-----------------


// Function to run Python script
function addPropertyUsingPython(filePath, filename, bank, pathToFunc) {
  return new Promise((resolve, reject) => {
    // Path to the Python script
    const scriptPath = pathToFunc
    console.log("I am File Path",scriptPath)
    // Use double quotes around paths to handle spaces and special characters
    const command = `python "${scriptPath}" "${filePath}" "${filename}" "${bank}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${stderr}`);
        return reject(`Error: ${stderr}`);
      }
      console.log(`Python script output: ${stdout}`);
      resolve(stdout);
    });
  });
}

//-------------------To add the FILENAME and ACTION property in the file using python-----------------

//-------------------To Update the Action in the file using python-----------------

// Function to run Python script
function runPythonScript(filePath, agreementNumber, actionStatus, actionTime, pathToFunc) {
  return new Promise((resolve, reject) => {
    const scriptPath = pathToFunc
    console.log("I am File Path",scriptPath)
    // Use double quotes around paths to handle spaces and special characters
    const command = `python "${scriptPath}" "${filePath}" "${agreementNumber}" "${actionStatus}" "${actionTime}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

//-------------------To Update the Action in the file using python-----------------

// Function to download file from S3
async function downloadFileFromS3(fileKey) {
  const params = {
    Bucket: 'jmb-enterprises-bucket',
    Key: fileKey
  };
  
  const command = new GetObjectCommand(params);
  try {
    const data = await s3.send(command);
    const fileStream = data.Body;
    return fileStream;
  } catch (error) {
    throw new Error(`Error downloading file from S3: ${error.message}`);
  }
}

// Function to delete file from S3
async function deleteFileFromS3(fileKey) {
  const params = {
    Bucket: 'jmb-enterprises-bucket',
    Key: fileKey
  };
  
  const command = new DeleteObjectCommand(params);
  try {
    await s3.send(command);
  } catch (error) {
    throw new Error(`Error deleting file from S3: ${error.message}`);
  }
}

// Function to upload the modified file back to S3 using putObject

async function uploadFileToS3( fileKey, filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);

    // Define the parameters for the upload
    const uploadParams = {
      Bucket: 'jmb-enterprises-bucket',
      Key: fileKey,
      Body: fileStream,
    };

    // Upload file using PutObjectCommand
    const data = await s3.send(new PutObjectCommand(uploadParams));
    // console.log("File uploaded successfully:", data);
    return data
  } catch (err) {
    console.error("Error uploading file:", err);
  }
}


// -------------------------ROUTING STARTS----------------------------------------------------

route.post("/", upload.any(), async (req, res) => {

  if (req.files && req.files.length > 0) {
    const { bank } = req.body;
    const file = req.files[0];
    const { originalname, key: fileKey, location: fileUrl } = file;
    const uploaddate = new Date();

    // Formatting the date
    const options = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    const formattedDate = uploaddate.toLocaleString('en-US', options);

    // Object to save in database
    const obj = {
      bank: bank,
      uploaddate: uploaddate,
      formatdate: formattedDate,
      file: {
        name: originalname,
        filekey: fileKey,
        path: fileUrl
      }
    };

    try {
      // Check if data with the same original file name already exists
      const isDataExist = await dataModel.findOne({ 'file.name': originalname });

      if (!isDataExist) {
        // Download the file from S3
        const fileStream = await downloadFileFromS3(fileKey);
        // console.log(fileStream)

        // Save the file content temporarily
        const tempFilePath = path.join(uploadDir, fileKey);
        const writeStream = fs.createWriteStream(tempFilePath);
        fileStream.pipe(writeStream);

        let pathToFunc;
        if (path.extname(originalname) === '.xlsx') {
          pathToFunc = path.join(__dirname, '..', 'assets', 'scripts', 'update_xlsx.py');
        } else if (path.extname(originalname) === '.csv') {
          pathToFunc = path.join(__dirname, '..', 'assets', 'scripts', 'update_csv.py');
        }
        // Run Python script to update the XLSX file
        await addPropertyUsingPython(tempFilePath, originalname, bank, pathToFunc);
        
        // saving the updated file back to cloud
        await uploadFileToS3(fileKey, tempFilePath);

        // Save to database if not existing
        await dataModel.create(obj);

          // Read the file data
          let getFileData;
          if (path.extname(originalname) === '.xlsx') {
            getFileData = readXLSXFile(tempFilePath);
          } else if (path.extname(originalname) === '.csv') {
            getFileData = await readCSVFile(tempFilePath);
          }
          // console.log(getFileData)

          // Fetch the updated file data from the database
          const fileData = await dataModel.findOne({ 'file.name': originalname });
          const finalFileData = {
            _id: fileData?._id,
            name: fileData?.file?.name,
            path: fileData?.file?.path,
            uploaddate: fileData?.uploaddate,
            formatdate: fileData?.formatdate,
            filekey: fileData?.file?.filekey,
            bank_name: fileData?.bank,
            data: getFileData
          };
          res.send({ status: 200, filedata: finalFileData });

          // Clean up temporary file after processing
          fs.unlinkSync(tempFilePath);

        writeStream.on('error', (err) => {
          console.error('Error writing file to local storage:', err);
          res.status(500).send({ message: 'Error writing file to local storage' });
        });
      } else {
        res.send({ status: 400, message: 'File already exists in database' });
      }
    } catch (error) {
      console.error("Error saving file data:", error);
      res.status(500).send("Internal server error.");
    }
  } else {
    console.log("No files uploaded.");
    res.status(400).send("No files uploaded.");
  }
});

route.get('/', async (req, res) => {
  // console.log("hello")
  try {
    // Fetch all file records from the database
    const allFileData = await dataModel.find();
    if (!allFileData || allFileData.length === 0) {
      return res.status(404).send({ message: "No files found" });
    }

    // Array to store promises for file content fetching
    const filePromises = allFileData.map(async (fileData) => {
      const fileKey = fileData?.file?.filekey; 
      const fileUrl = fileData?.file?.path;
      const name = fileData?.file?.name

      try {
        // Download the file from S3
        const fileStream = await downloadFileFromS3(fileKey);
        
        // Save the file content temporarily
        const tempFilePath = path.join(uploadDir, fileKey);
        const writeStream = fs.createWriteStream(tempFilePath);
        fileStream.pipe(writeStream);
        // console.log(tempFilePath)

        // Return a promise that resolves when the file is written
        return new Promise((resolve, reject) => {
          writeStream.on('finish', async () => {
            let fileContent;
            if (path.extname(fileData.file.name) === '.xlsx') {
              fileContent = readXLSXFile(tempFilePath, name);
            } else if (path.extname(fileData.file.name) === '.csv') {
              fileContent = await readCSVFile(tempFilePath);
            }

            // Clean up temporary file after processing
            fs.unlinkSync(tempFilePath);

            // Combine metadata and file content
            resolve({
              _id: fileData._id,
              name: fileData.file.name,
              path: fileData.file.path,
              uploaddate: fileData.uploaddate,
              formatdate: fileData.formatdate,
              filekey: fileData.file.filekey,
              bank_name: fileData.bank,
              data: fileContent
            });
          });

          writeStream.on('error', (err) => {
            console.error('Error writing file to local storage:', err);
            reject(err);
          });
        });
      } catch (err) {
        console.error(`Error processing file ${fileKey}:`, err);
        return {
          _id: fileData._id,
          name: fileData.file.name,
          error: 'Error retrieving file'
        };
      }
    });

    // Wait for all promises to resolve
    const filesData = await Promise.all(filePromises);

    // console.log("hello")

    // Send the combined data
    res.send({
      status: 200,
      filedata: filesData
    });
  } catch (error) {
    console.error("Error retrieving all file data:", error);
    res.status(500).send("Internal server error.");
  }
});

route.put("/", async (req, res) => {
  if(req.body?.data?.action) {
    const { fileName, agreementNumber, actionStatus, actionTime } = req.body?.data?.action;
  
  // console.log(fileName)
  try {
    // Find the file data by ID
    const fileData = await dataModel.findOne({'file.name' : fileName})
    if (!fileData) {
      return res.status(404).send({ message: "File not found" });
    }

    // Get file details
    const fileKey = fileData?.file?.filekey; // S3 key for the file
    const filePath = path.join(uploadDir, fileKey); // Local path to save the file

    // Download the file from S3
    const fileStream = await downloadFileFromS3(fileKey);
    const writeStream = fs.createWriteStream(filePath);
    
    fileStream.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {

        let pathToFunc;
        if (path.extname(fileKey) === '.xlsx') {
          pathToFunc = path.join(__dirname, '..', 'assets', 'scripts', 'updateAction.py');
        } else if (path.extname(fileKey) === '.csv') {
          pathToFunc = path.join(__dirname, '..', 'assets', 'scripts', 'updateAction_csv.py');
        }

        // Run Python script to update the action in the file
        await runPythonScript(filePath, agreementNumber, actionStatus, actionTime, pathToFunc);

         // saving the updated file back to cloud
        await uploadFileToS3(fileKey, filePath);

        // Send success response
        res.send({ status: 200, message: "Action updated successfully", actionTime : actionTime });

        // Clean up temporary file after processing
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error("Error running Python script:", error);
        res.status(500).send("Internal server error.");
      }
    });

    writeStream.on('error', (err) => {
      console.error('Error writing file to local storage:', err);
      res.status(500).send({ message: 'Error writing file to local storage' });
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Internal server error.");
  }
  }
});

// DELETE route to remove multiple files and their database records
route.delete('/', async (req, res) => {
  const { IDs } = req.body;

  try {
    // Initialize arrays to track success and errors
    const errors = [];
    const deletedIds = [];

    // Loop through each file ID
    for (const fileId of IDs) {
      try {
        // Find the file record by ID
        const findFile = await dataModel.findOne({ _id: fileId });
        if (!findFile) {
          console.log(`File not found for ID: ${fileId}`);
          errors.push({ fileId, error: 'File not found' });
          continue; // Skip to the next iteration if the file is not found
        }

        const fileKey = findFile?.file.filekey; // Assuming 'newname' is the S3 file key

        // Delete the file from S3 bucket
        await deleteFileFromS3(fileKey);

        // Delete the file record from the database
        await dataModel.deleteOne({ _id: fileId });

        // Track successful deletions
        deletedIds.push(fileId);

      } catch (err) {
        console.error(`Error processing file ID: ${fileId}`, err);
        errors.push({ fileId, error: err.message });
      }
    }

    // Respond with status 200 even if there are some errors, detailing what succeeded and failed
    res.status(200).send({
      status: 200,
      message: errors.length > 0 ? 'Partial success' : 'All files deleted successfully',
      deletedIds,
      errors
    });

  } catch (error) {
    console.error('Error deleting files:', error);
    res.status(500).send({ status: 500, message: 'Internal server error' });
  }
});


  return route;
};