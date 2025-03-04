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
  

  function readXLSXFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming we want the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet); // Converts to JSON format
    return data;
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
    maxAttempts: 5,
    requestTimeout: 50000,
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
      // const allowedTypes = [
      //   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      //   'text/csv' // CSV
      // ];
  
      // Log the incoming file type
      // logger.info(`Incoming file type: ${file.mimetype} for file: ${file.originalname}`);
  
      cb(null, true);
      // if (allowedTypes.includes(file.mimetype)) {
      // } else {
      //   logger.error(`Invalid file type: ${file.mimetype} for file: ${file.originalname}`);
      //   cb(new Error('Invalid file type'), false);
      // }
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
  
  async function downloadFileFromS3(fileKey) {
    const params = {
      Bucket: 'jmb-enterprises-bucket',  // Your S3 bucket name
      Key: fileKey  // The key of the file you're trying to download
    };
  
    const command = new GetObjectCommand(params);
  
    try {
      const data = await s3.send(command);
      if (!data.Body) {
        console.error('No body in S3 response');
        throw new Error('No file content found');
      }
      
      const fileStream = data.Body;  // This should be a stream
      // console.log('File stream received:', fileStream);
      return fileStream;  // Return the file stream for further processing
    } catch (error) {
      console.error('Error downloading file from S3:', error);
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
  
  // Function to upload updated JSON to S3
  async function uploadJSONToS3(fileKey, jsonData) {
    try {
      const fileContent = JSON.stringify(jsonData, null, 2); // Convert JSON to string with indentation
      const uploadParams = {
        Bucket: 'jmb-enterprises-bucket',
        Key: fileKey,
        Body: fileContent,
        ContentType: 'application/json' // Set content type to JSON
      };
      const data = await s3.send(new PutObjectCommand(uploadParams));
      return data;
    } catch (err) {
      console.error("Error uploading JSON to S3:", err);
    }
  }
  
  // Function to download and save the file to the temporary directory
  async function downloadAndSaveFile(fileStream, tempFilePath) {
    return new Promise((resolve, reject) => {
      // Create a write stream to the temporary file path
      const writeStream = fs.createWriteStream(tempFilePath);
  
      // Log the start of the piping process
      console.log('Starting to pipe the file');
  
      // Check if fileStream is a valid stream
      if (!fileStream || typeof fileStream.pipe !== 'function') {
        console.error('fileStream is not a valid stream');
        return reject(new Error('fileStream is not a valid stream'));
      }
  
      // Listen for errors on the fileStream
      fileStream.on('error', (err) => {
        console.error('Error in file stream:', err);
        reject(`Error in file stream: ${err.message}`);
      });
  
      // Pipe the fileStream to the writeStream
      fileStream.pipe(writeStream);
  
      // Listen for errors on the writeStream
      writeStream.on('error', (err) => {
        console.error('Error in write stream:', err);
        reject(`Error in write stream: ${err.message}`);
      });
  
      // When the file is successfully written, resolve the promise
      writeStream.on('finish', () => {
        console.log('File successfully downloaded and written to disk');
        resolve(tempFilePath);
      });
  
      // Optionally, add a 'data' event to log chunks of data being received (useful for debugging large files)
      fileStream.on('data', (chunk) => {
        // console.log('Received data chunk:', chunk.length);
      });
  
      // Optionally, log the fileStream size or information
      // console.log('FileStream received:', fileStream);
    });
  }
  
  
  // -------------------------ROUTING STARTS----------------------------------------------------
  
  // Main route for file upload
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
        const existingData = await dataModel.findOne({ 'file.name': originalname });
  
        if (!existingData) {
          // Download the file from S3
          const fileStream = await downloadFileFromS3(fileKey);
  
          // Save the file content temporarily
          const tempFilePath = path.join(uploadDir, fileKey);
          const writeStream = fs.createWriteStream(tempFilePath);
          fileStream.pipe(writeStream);
  
          writeStream.on('finish', async () => {
            // Read the XLSX data and convert it to JSON
            let jsonData = readXLSXFile(tempFilePath);
  
            // Loop through each object in the JSON data and add required fields only if they don't already exist
            jsonData = jsonData.map(item => ({
              ...item,
              FILENAME: item.FILENAME || originalname,  // Add FILENAME if not already present
              BANK: item.BANK || bank,                 // Add BANK if not already present
              HOLD: item.HOLD || "",                  // Add HOLD if not already present
              RELEASE: item.RELEASE || "",            // Add RELEASE if not already present
              IN_YARD: item.IN_YARD || "",            // Add IN_YARD if not already present
              ACTION: item.ACTION || ""               // Add ACTION if not already present
            }));
  
            // Run the Python script to modify the JSON data (if necessary)
            // await addPropertyUsingPython(tempFilePath, originalname, bank, path.join(__dirname, '..', 'assets', 'scripts', 'update_xlsx.py'));
  
            // Upload the modified JSON data to S3
            await uploadJSONToS3(fileKey, jsonData);
  
            // Save to database
            const createdData = await dataModel.create(obj);
  
            // Read and return the updated file data
            const finalFileData = {
              _id: createdData._id,
              name: obj.file.name,
              path: obj.file.path,
              uploaddate: obj.uploaddate,
              formatdate: obj.formatdate,
              filekey: obj.file.filekey,
              bank_name: obj.bank,
              data: jsonData, // Return the modified JSON data
            };
  
            res.send({ status: 200, filedata: finalFileData });
  
            // Clean up temporary file after processing
            fs.unlinkSync(tempFilePath);
          });
  
          writeStream.on('error', (err) => {
            console.error('Error writing file to local storage:', err);
            res.status(500).send({ message: 'Error writing file to local storage' });
          });
        } else {
          res.send({ status: 400, message: 'File already exists in database. Fields not updated.' });
        }
      } catch (error) {
        console.error("Error saving file data:", error);
        res.status(500).send("Internal server error.");
      }
    } else {
      res.status(400).send("No files uploaded.");
    }
  });  
  
  route.get('/', async (req, res) => {
    try {
      // Fetch all file records from the database
      const allFileData = await dataModel.find({});
      
      if (!allFileData || allFileData.length === 0) {
        return res.status(404).send({ message: "No files found" });
      }
      
      // Array to store promises for fetching file content
      const filePromises = allFileData.map(async (fileData) => {
        const fileKey = fileData?.file?.filekey; // File key for S3
        const name = fileData?.file?.name; // Original file name
  
        try {
          // Download the file from S3 and pipe it to the temporary file
          const fileStream = await downloadFileFromS3(fileKey);
          const tempFilePath = path.join(uploadDir, `${fileKey}`);
          console.log(`Saving file to: ${tempFilePath}, ${fileKey}`);

          
          // Ensure the whole file is being written
          await downloadAndSaveFile(fileStream, tempFilePath);
  
          // Check if file is downloaded completely by comparing size
          const stats = fs.statSync(tempFilePath);
          console.log(`File downloaded with size: ${stats.size} bytes`);
  
          if (stats.size === 0) {
            throw new Error("Downloaded file is empty");
          }
  
          // Read the JSON file content
          const fileContent = JSON.parse(fs.readFileSync(tempFilePath, 'utf-8'));
  
          // Clean up temporary file after reading
          fs.unlinkSync(tempFilePath);
  
          return {
            _id: fileData._id,
            name: fileData.file.name,
            path: fileData.file.path,
            uploaddate: fileData.uploaddate,
            formatdate: fileData.formatdate,
            filekey: fileData.file.filekey,
            bank_name: fileData.bank,
            data: fileContent // JSON data
          };
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
  
      // Send the combined data to the client
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
    if (req.body?.data?.action) {
      const { fileName, agreementNumber, actionStatus, actionTime } = req.body?.data?.action;
  
      try {
        // Find the file data by name
        const fileData = await dataModel.findOne({ "file.name": fileName });
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
  
        writeStream.on("finish", async () => {
          try {
            // Check if the file is in JSON format
            const fileContent = fs.readFileSync(filePath, "utf8");
            let jsonData;
  
            try {
              jsonData = JSON.parse(fileContent); // Try parsing as JSON
            } catch (err) {
              console.error("File is not in JSON format:", err);
              return res.status(400).send({ message: "Invalid file format" });
            }
            // console.log(jsonData.find(value ))
            // Find and update the agreement data in the JSON
            const agreementIndex = jsonData.findIndex(
              (item) => item.AGREEMENTNO == agreementNumber
            );
  
            if (agreementIndex === -1) {
              return res.status(404).send({ message: "Agreement not found" });
            }

            const convertAction = {
              'Hold': 'HOLD',
              'Release': 'RELEASE',
              'In Yard': 'IN_YARD'
            }
  
            jsonData[agreementIndex].ACTION = actionStatus;
            jsonData[agreementIndex][convertAction[actionStatus]] = actionTime;
  
            // Save the updated JSON data back to the file
            fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf8");
  
            // Upload the updated file back to S3
            await uploadFileToS3(fileKey, filePath);
  
            // Send success response
            res.send({
              status: 200,
              message: "Action updated successfully",
              actionTime: actionTime,
            });
  
            // Clean up temporary file after processing
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error("Error processing file:", error);
            res.status(500).send({ message: "Internal server error." });
          }
        });
  
        writeStream.on("error", (err) => {
          console.error("Error writing file to local storage:", err);
          res.status(500).send({ message: "Error writing file to local storage" });
        });
      } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ message: "Internal server error." });
      }
    } else {
      res.status(400).send({ message: "Invalid request payload" });
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