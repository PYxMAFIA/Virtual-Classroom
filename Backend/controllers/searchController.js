const { MongoClient, GridFSBucket } = require("mongodb");
require("dotenv").config();

const dbName = "realPyq";
const connectToDatabase = require("../config/dbVerified.js");

const mongoURI = process.env.mongoURL;
const client = new MongoClient(mongoURI);

let gridFSBucket;

/**
 * Initialize GridFSBucket safely once
 */
async function initializeGridFSBucket() {
  try {
    const db = await connectToDatabase();
    gridFSBucket = new GridFSBucket(db);
    console.log("✅ GridFSBucket initialized for verified files");
  } catch (err) {
    console.error("❌ Error initializing GridFSBucket:", err);
  }
}
initializeGridFSBucket();

/**
 * Controller: Fetch all files, match manually in backend, and send the PDF
 */
const searchFiles = async (req, res) => {
  try {
    const { college, filename, year, examType } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: "Filename is required.",
      });
    }

    if (!gridFSBucket) {
      return res.status(500).json({
        error: "GridFSBucket is not initialized yet. Try again later.",
      });
    }

    if (!client.topology?.isConnected()) {
      await client.connect();
    }

    const db = client.db(dbName);
    const filesCollection = db.collection("fs.files");
    const chunksCollection = db.collection("fs.chunks");

    // ✅ Step 1: Fetch all files
    const allFiles = await filesCollection.find({}).toArray();

    console.log(`📦 Total files found: ${allFiles.length}`);

    // ✅ Step 2: Find the file (case-insensitive matching)
    const matchingFile = allFiles.find((file) => {
      const metadata = file.metadata || {};
      const filenameMatch =
        file.filename?.trim().toLowerCase() === filename.trim().toLowerCase();

      // College is optional — if provided, filter by it
      if (college) {
        const collegeMatch =
          metadata.college?.trim?.()?.toLowerCase() === college.trim().toLowerCase();
        return filenameMatch && collegeMatch;
      }
      return filenameMatch;
    });

    console.log("🔍 Matching file:", matchingFile ? matchingFile.filename : "none");

    if (!matchingFile) {
      return res.status(404).json({
        error: "No matching file found in database for the given criteria.",
      });
    }

    // ✅ Step 3: Use file ID to get chunks
    const chunks = await chunksCollection
      .find({ files_id: matchingFile._id })
      .sort({ n: 1 })
      .toArray();

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({
        error: "No file data found (missing chunks).",
      });
    }

    // ✅ Step 4: Combine all chunks
    const pdfData = Buffer.concat(chunks.map((chunk) => chunk.data.buffer));

    // ✅ Step 5: Send file as PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${matchingFile.filename}"`
    );
    res.send(pdfData);

    console.log(`✅ File sent successfully: ${matchingFile.filename}`);
  } catch (error) {
    console.error("❌ Error searching or sending file:", error);
    res.status(500).json({
      error: "Internal server error while retrieving the file.",
    });
  }
};

module.exports = { searchFiles };