module.exports = (io) => {

    const route = require('express').Router();
    const { v4: uuidv4 } = require('uuid');
    const dataModel = require('../model/addDataSchema');
    const path = require('path');
    const fs = require('fs');
    const xlsx = require('xlsx');
    require('dotenv').config(); 
  const multer = require('multer');
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const zlib = require('zlib');
  const { Upload } = require('@aws-sdk/lib-storage'); // Import Upload
  const redis = require('redis'); // Import Redis
  const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:6379' // Use IPv4 address
  });
  
  // Handle connection events
  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  // Ensure the client is connected before using it
  async function ensureRedisClient() {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }
  
  // ---------------------------------File Reading-----------------------------------------
  

  function readXLSXFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming we want the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet); // Converts to JSON format
    return data;
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

  //-------------------------File Saving------------------------------------
  
  
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
  
  async function uploadFileToS3(fileKey, filePath) {
    try {
        // Create a read stream for the file
        const fileStream = fs.createReadStream(filePath);
        
        // Define the parameters for the upload
        const uploadParams = {
            Bucket: 'jmb-enterprises-bucket',
            Key: fileKey, // Append .gz to the file key for the compressed file
            Body: fileStream, // Use the stream for the upload
            ContentEncoding: 'gzip' // Set content encoding to gzip
        };

        // Use the Upload class to handle the upload
        const upload = new Upload({
            client: s3,
            params: uploadParams,
        });

        await upload.done(); // Wait for the upload to complete
        console.log("File uploaded successfully:", uploadParams.Key);
    } catch (err) {
        console.error("Error uploading file:", err);
        throw new Error(`Error uploading file: ${err.message}`);
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

  // Helper function to convert a stream to a buffer
  const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
  };
  
  
  // -------------------------ROUTING STARTS----------------------------------------------------
  
  // Main route for file upload
  route.post("/", async (req, res) => {
    // Use multer's memory storage to handle files manually
    const upload = multer({ storage: multer.memoryStorage() }).any();
    
    upload(req, res, async (err) => {
      if (err) {
        return res.status(500).send({ message: 'Error uploading file' });
      }
      
      if (req.files && req.files.length > 0) {
        const { bank } = req.body;
        const file = req.files[0];
        const { originalname, buffer } = file; // Get the file buffer instead of S3 upload
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
            buffer: buffer
          }
        };
        
        try {
          // Check if data with the same original file name already exists in Redis
          const cachedData = await redisClient.get(`file:${originalname}`); // Use a unique key
          if (cachedData) {
            return res.send({ status: 200, filedata: JSON.parse(cachedData) });
          }

          // Check if data with the same original file name already exists
          const existingData = await dataModel.findOne({ 'file.name': originalname });
          
          if (!existingData) {
            // Instead of uploading directly to S3, save the buffer to a temporary file
            const tempFilePath = path.join(uploadDir, originalname);
            fs.writeFileSync(tempFilePath, buffer); // Save the file buffer to a temporary file
            
            // Read the XLSX file content for modification
            const jsonData = readXLSXFile(tempFilePath); // Use the readXLSXFile function to read the XLSX file
            
            // Modify each entry to include BANK and FILENAME headings
            const modifiedData = jsonData.map(entry => ({
              BANK: bank,
              FILENAME: originalname,
              HOLD: "",
              RELEASE: "",
              IN_YARD: "",
              ACTION: "",
              ...entry // Spread the existing entry properties
            }));
            
            // Write the modified content back to the temporary file in JSON format
            fs.writeFileSync(tempFilePath, JSON.stringify(modifiedData, null, 2), 'utf8');

            // Create a gzip stream from the modified temporary file
            const gzipStream = fs.createReadStream(tempFilePath).pipe(zlib.createGzip());

            // Define the path for the compressed file without the original extension
            const gzipFilePath = path.join(uploadDir, `${path.parse(originalname).name}.gz`); // Remove extension

            // Create a write stream for the gzip file
            const gzipWriteStream = fs.createWriteStream(gzipFilePath);

            // Pipe the gzip stream to the write stream
            gzipStream.pipe(gzipWriteStream);

            gzipWriteStream.on('finish', async () => {
              try {
                // Generate a unique file name for the upload
                const uniqueFileName = `${uuidv4()}.gz`; // Unique name for the gzip file

                // Upload the compressed file to S3 using Upload
                const uploadParams = {
                  Bucket: 'jmb-enterprises-bucket',
                  Key: uniqueFileName, // Use the unique name for the upload
                  Body: fs.createReadStream(gzipFilePath), // Use a stream for the upload
                  ContentEncoding: 'gzip' // Set content encoding to gzip
                };

                const upload = new Upload({
                  client: s3,
                  params: uploadParams,
                });

                await upload.done(); // Wait for the upload to complete

                // Save to database with the original name, unique file key, and URL
                const createdData = await dataModel.create({
                  ...obj,
                  file: {
                    name: originalname,
                    filekey: uniqueFileName,
                    path: `https://jmb-enterprises-bucket.s3.us-west-2.amazonaws.com/${uniqueFileName}`
                  }
                });

                // Cache the created data in Redis with a unique key
                await redisClient.set(`file:${originalname}`, JSON.stringify(createdData));

                // Read the file from S3 to send back to the client
                const fileStream = await downloadFileFromS3(uniqueFileName); // Use the unique file key to download the file
                
                // Convert the stream to a buffer
                const fileContentBuffer = await streamToBuffer(fileStream);
                
                // Decompress the gzip buffer if necessary
                const decompressedBuffer = zlib.gunzipSync(fileContentBuffer);
                
                // Convert the decompressed buffer to a string
                const fileContent = decompressedBuffer.toString('utf8');

                // Read and return the updated file data
                const finalFileData = {
                  _id: createdData._id,
                  name: createdData.file.name, // Use the original file name from createdData
                  path: createdData.file.path, // Use the URL from createdData
                  uploaddate: obj.uploaddate,
                  formatdate: obj.formatdate,
                  filekey: createdData.file.filekey, // Use the unique file key from createdData
                  bank_name: obj.bank,
                  data: JSON.parse(fileContent) // Include the JSON data in the 'filedata' property
                };
                
                // Cache the file content in Redis with a unique key
                await redisClient.set(`file:${uniqueFileName}`, fileContent);

                res.send({ status: 200, filedata: finalFileData }); // Send the finalFileData in the response

                // Clean up temporary files after processing
                fs.unlinkSync(tempFilePath);
                fs.unlinkSync(gzipFilePath); // Clean up the gzip file after uploading
              } catch (err) {
                console.error('Error uploading file:', err);
                res.status(500).send({ message: 'Error uploading file' });
              }
            });

            gzipWriteStream.on('error', (err) => {
              console.error('Error writing gzip file:', err);
              res.status(500).send({ message: 'Error writing gzip file' });
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
  
        // Check Redis cache for file content using a unique key
        await ensureRedisClient(); // Ensure the client is connected
        const cachedFileContent = await redisClient.get(`file:${fileKey}`); // Use a unique key
        if (cachedFileContent) {
          return {
            _id: fileData._id,
            name: fileData.file.name,
            path: fileData.file.path,
            uploaddate: fileData.uploaddate,
            formatdate: fileData.formatdate,
            filekey: fileData.file.filekey,
            bank_name: fileData.bank,
            data: JSON.parse(cachedFileContent) // Use cached data
          };
        }

        try {
          // Download the file from S3 and pipe it to the temporary file
          const fileStream = await downloadFileFromS3(fileKey);
          const tempFilePath = path.join(uploadDir, `${fileKey}`);
          // console.log(`Saving file to: ${tempFilePath}, ${fileKey}`);

          // Ensure the whole file is being written
          await downloadAndSaveFile(fileStream, tempFilePath);
  
          // Check if file is downloaded completely by comparing size
          const stats = fs.statSync(tempFilePath);
          console.log(`File downloaded with size: ${stats.size} bytes`);
  
          if (stats.size === 0) {
            throw new Error("Downloaded file is empty");
          }
  
          // Decompress the gzip file
          const decompressedData = fs.readFileSync(tempFilePath);
          const jsonData = zlib.gunzipSync(decompressedData); // Decompress the data
          const fileContent = JSON.parse(jsonData.toString('utf-8')); // Parse the JSON content
  
          // Clean up temporary file after reading
          fs.unlinkSync(tempFilePath);
  
          // Cache the file content in Redis with a unique key
          await redisClient.set(`file:${fileKey}`, JSON.stringify(fileContent));

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
            // Decompress the gzipped file
            const decompressedData = fs.readFileSync(filePath);
            const jsonData = JSON.parse(zlib.gunzipSync(decompressedData).toString('utf8')); // Decompress and parse JSON
            
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
            const updatedData = zlib.gzipSync(JSON.stringify(jsonData, null, 2)); // Compress the updated JSON data
            fs.writeFileSync(filePath, updatedData); // Write the compressed data back to the file
            
            // Upload the updated file back to S3
            await uploadFileToS3(fileKey, filePath);
            
            await ensureRedisClient(); // Ensure Redis client is connected
            
            // After updating the file, update the cache
            await redisClient.set(`file:${fileKey}`, JSON.stringify(jsonData)); // Ensure the correct key is used

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
  
      // Ensure the Redis client is connected
      await ensureRedisClient();
  
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
  
          // Delete the file from Redis cache
          await redisClient.del(fileKey);
  
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

