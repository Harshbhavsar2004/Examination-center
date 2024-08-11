const { Web3 } = require("web3");

const express = require("express");
const router = new express.Router();
const userdb = require("../models/userSchema");
const examdata = require("../models/ExamdataSchema")
const authenticate = require("../middleware/authenticate");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const limiter = require("../middleware/limiter")
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const web3 = new Web3(process.env.WEB3_PROVIDER_URL);

const contractABI = require("./../abi.json"); // Load your contract ABI
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, contractAddress);

const serverWalletAddress = process.env.SERVER_WALLET_ADDRESS;
const serverWalletPrivateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
console.log(serverWalletPrivateKey);

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

web3.eth.accounts.wallet.add(serverWalletPrivateKey); // Add your server wallet to the Web3 instance

async function checkBalance() {
  const balance = await web3.eth.getBalance(process.env.SERVER_WALLET_ADDRESS);
}

checkBalance();

const keysecret = process.env.SECRET_KEY; // JWT Token secret key

// email config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      if (file.fieldname === "photo") {
        return "images/photos";
      } else if (file.fieldname === "sign") {
        return "images/signs";
      } else {
        throw new Error("Invalid field name");
      }
    },
    public_id: (req, file) => file.originalname,
  },
});

// Initialize Multer with Cloudinary storage
const upload = multer({ storage: storage });

// Register route
router.post(
  "/register",
  upload.fields([{ name: "photo" }, { name: "sign" }]),
  async (req, res) => {
    const {
      fname,
      lname,
      email,
      phone,
      dob,
      course,
      batch,
      password,
      cpassword,
    } = req.body;
    let photo = null;
    let sign = null;

    if (req.files && req.files.photo && req.files.photo.length > 0) {
      photo = req.files.photo[0].path; // Cloudinary file URL
    }

    if (req.files && req.files.sign && req.files.sign.length > 0) {
      sign = req.files.sign[0].path; // Cloudinary file URL
    }

    if (
      !fname ||
      !lname ||
      !email ||
      !phone ||
      !dob ||
      !course ||
      !batch ||
      !password ||
      !cpassword
    ) {
      return res.status(422).json({ error: "Fill all the details" });
    }

    try {
      const preuser = await userdb.findOne({ email: email });

      if (preuser) {
        return res.status(422).json({ error: "This Email is Already Exist" });
      } else if (password !== cpassword) {
        return res
          .status(422)
          .json({ error: "Password and Confirm Password Not Match" });
      } else {
        const finalUser = new userdb({
          fname,
          lname,
          email,
          phone,
          dob,
          course,
          batch,
          password,
          cpassword,
          photo,
          sign,
        });

        const storeData = await finalUser.save();

        // Generate token
        const token = jwt.sign({ _id: storeData._id }, keysecret, {
          expiresIn: "1d",
        });

        console.log(storeData);
        return res.status(201).json({ status: 201, storeData, token });
      }
    } catch (error) {
      console.error("catch block error:", error);
      return res.status(422).json(error);
    }
  }
);

// user Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Fill All The Details" });
  }

  try {
    const userValid = await userdb.findOne({ email: email });

    if (userValid) {
      if (password !== userValid.password) {
        return res.status(422).json({ error: "Invalid Credentials" });
      }

      // Generate token
      const token = await userValid.generateAuthtoken();
      console.log(token);

      // Generate cookie
      res.cookie("usercookie", token, {
        expires: new Date(Date.now() + 9000000),
        httpOnly: true,
      });

      // Include role in the result
      const result = {
        user: {
          email: userValid.email,
          role: userValid.Role, // Assuming 'role' field exists in the user document
        },
        token,
      };

      res.status(201).json({ status: 201, result });
    } else {
      res.status(401).json({ status: 401, message: "Invalid Credentials" });
    }
  } catch (error) {
    res.status(401).json({ status: 401, error });
    console.log(error);
  }
});


router.get('/fetchusers', async (req, res) => {
  try {
    const users = await userdb.find({}, 'fname lname Score Cheat');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// user valid
router.get("/validuser", authenticate, async (req, res) => {
  try {
    console.log(req.userId)
    const ValidUserOne = await userdb.findOne({ _id: req.userId });
    res.status(201).json({ status: 201, ValidUserOne });
  } catch (error) {
    res.status(401).json({ status: 401, error });
    console.log(error)
  }
});

// user logout
router.get("/logout", authenticate, async (req, res) => {
  try {
    console.log("Logout request received");
    console.log("Current user:", req.rootUser);
    console.log("Current token:", req.token);

    req.rootUser.tokens = req.rootUser.tokens.filter((curelem) => {
      return curelem.token !== req.token;
    });

    res.clearCookie("usercookie", { path: "/" });

    await req.rootUser.save();

    res.status(201).json({ status: 201 });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(401).json({ status: 401, error });
  }
});

// send email Link For reset Password
router.post("/sendpasswordlink", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(401).json({ status: 401, message: "Enter Your Email" });
  }

  try {
    const userfind = await userdb.findOne({ email: email });

    // token generate for reset password
    const token = jwt.sign({ _id: userfind._id }, keysecret, {
      expiresIn: "120s",
    });

    const setusertoken = await userdb.findByIdAndUpdate(
      { _id: userfind._id },
      { verifytoken: token },
      { new: true }
    );

    if (setusertoken) {
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Sending Email For password Reset",
        text: `This Link is Valid For 2 MINUTES ${process.env.BASE_URL}/forgotpassword/${userfind.id}/${setusertoken.verifytoken}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("error", error);
          res.status(401).json({ status: 401, message: "Email Not Send" });
        } else {
          console.log("Email sent", info.response);
          res
            .status(201)
            .json({ status: 201, message: "Email Sent Successfully" });
        }
      });
    }
  } catch (error) {
    res.status(401).json({ status: 401, message: "Invalid User" });
  }
});

// verify user for forgot password time
router.get("/forgotpassword/:id/:token", async (req, res) => {
  const { id, token } = req.params;

  try {
    const validuser = await userdb.findOne({ _id: id, verifytoken: token });

    const verifyToken = jwt.verify(token, keysecret);

    if (validuser && verifyToken._id) {
      res.status(201).json({ status: 201, validuser });
    } else {
      res.status(401).json({ status: 401, message: "User Not Exist" });
    }
  } catch (error) {
    res.status(401).json({ status: 401, error });
  }
});

// change password
router.post("/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    const validuser = await userdb.findOne({ _id: id, verifytoken: token });
    const verifyToken = jwt.verify(token, keysecret);

    if (validuser && verifyToken._id) {
      const setnewuserpass = await userdb.findByIdAndUpdate(
        { _id: id },
        { password: password }
      );

      setnewuserpass.save();
      res.status(201).json({ status: 201, setnewuserpass });
    } else {
      res.status(401).json({ status: 401, message: "User Not Exist" });
    }
  } catch (error) {
    res.status(401).json({ status: 401, error });
  }
});

router.post("/score", async (req, res) => {
  const { Score } = req.body;
  const token = req.headers.authorization.split(" ")[1]; // Assuming the token is passed as a Bearer token

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the user by ID and token
    const validuser = await userdb.findOne({
      _id: decodedToken._id,
      "tokens.token": token,
    });

    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }

    // Update the user's Score
    validuser.Score = Score; // Assuming 'Score' is the field in your user schema to store Score
    await validuser.save();

    res.status(200).json({ message: "Score updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/score", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1]; // Assuming the token is passed as a Bearer token

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the user by ID and token
    const validuser = await userdb.findOne({
      _id: decodedToken._id,
      "tokens.token": token,
    });

    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }

    // Get the user's Score
    const userScore = validuser.Score; // Assuming 'Score' is the field in your user schema to store Score
    console.log(userScore);
    
    res.status(200).json({ Score: userScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/cheat/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find user by userId and retrieve Cheat and txUrl fields
    const user = await userdb.findById(userId, { Cheat: 1, txUrl: 1 });

    if (user) {
      res.status(200).json({ Cheat: user.Cheat, txUrl: user.txUrl });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/resetCounts/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // Find the user by ID and reset cheat counts
    const user = await userdb.findByIdAndUpdate(
      userId,
      { Cheat: [], left: 0, right: 0, Voice: 0 },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Cheat counts reset successfully", Cheat: [] });
  } catch (error) {
    console.error("Error resetting cheat counts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



router.post("/left", limiter, async (req, res) => {
  const { left } = req.body;
  console.log(left);
  const token = req.headers.authorization.split(" ")[1];

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);
    const timestamp = Date.now();
    const utcDate = new Date(timestamp);
    const istDate = new Date(utcDate.getTime() + 330 * 60); // Adding 5 hours 30 minutes
    const realdate = istDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }); // Example: "7/18/2024, 12:48:00 PM"

    // Find the user by ID and token
    const validuser = await userdb.findOneAndUpdate(
      {
        _id: decodedToken._id,
        "tokens.token": token,
      },
      {
        $inc: {
          left: 1,
        },
        $push: {
          // Add a new behavior log entry
          Cheat: {
            type: "left",
            timestamp: realdate,
          },
        },
      },
      { new: true } 
    );


    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }

    res
      .status(200)
      .json({
        message: "Left count updated successfully",
        left: validuser.left,
      });
    // res.status(200).json({ message: "Left count updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/right", limiter, async (req, res) => {
  const { right } = req.body;
  console.log(right)
  const token = req.headers.authorization.split(" ")[1]; // Assuming the token is passed as a Bearer token
  const timestamp = Date.now();
  const utcDate = new Date(timestamp);
  const istDate = new Date(utcDate.getTime() + 330 * 60); // Adding 5 hours 30 minutes
  const realdate = istDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  }); // Example: "7/18/2024, 12:48:00 PM"

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the user by ID and token
    const validuser = await userdb.findOneAndUpdate(
      {
        _id: decodedToken._id,
        "tokens.token": token,
      },
      {
        $inc: {
          right: 1,
        },
        $push: {
          // Add a new behavior log entry
          Cheat: {
            type: "right",
            timestamp: realdate,
          },
        },
      }, // Increment rightCount by 1
      { new: true } // Return the updated document
    );

    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }
    res.status(200).json({ message: "Right count updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/voice", limiter, async (req, res) => {
  const { Voice } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  const timestamp = Date.now();
  const utcDate = new Date(timestamp);
  const istDate = new Date(utcDate.getTime() + 330 * 60);
  const realdate = istDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Find the user by ID and token, and increment Voice count
    const validuser = await userdb.findOneAndUpdate(
      {
        _id: decodedToken._id,
        "tokens.token": token,
      },
      {
        $inc: {
          Voice: 1,
        },
        $push: {
          // Add a new behavior log entry
          Cheat: {
            type: "voice",
            timestamp: realdate,
          },
        },
      },
      { new: true }
    );

    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }



    res.status(200).json({ message: "Voice updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/submit", limiter , async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  console.log(token);

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    const validuser = await userdb.findOne(
      {
        _id: decodedToken._id,
        "tokens.token": token,
      },
      {
        Cheat: 1,
      }
    );

    if (validuser) {
      const userCheats = validuser.Cheat.map((cheat) => [
        cheat.type,
        cheat.timestamp,
      ]);

      const receipt = await contract.methods
        .addCheats(serverWalletAddress, userCheats)
        .send({
          from: serverWalletAddress,
        });

      console.log("Transaction receipt:", receipt);

      const txUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
      console.log(txUrl)

      // Save only the Etherscan URL to the user's document
      await userdb.findOneAndUpdate(
        {
          _id: decodedToken._id,
          "tokens.token": token,
        },
        {
          $set: { txUrl: txUrl },
        },
        { new: true } // Return the updated document
      );

      res.status(200).json({ Cheat: validuser.Cheat, txUrl: txUrl });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/user-data", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1]; // Assuming the token is passed as a Bearer token

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the user by ID and token
    const validuser = await userdb.findOne({
      _id: decodedToken._id,
      "tokens.token": token,
    });

    if (!validuser) {
      return res.status(401).json({ message: "Invalid user or token" });
    }

    // Get the user's data
    const userData = {
      name: validuser.fname,
      lastname: validuser.lname,
      score: validuser.Score,
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get('/user/stats', async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send('Authentication token is required');
  }

  try {
    const decodedToken = jwt.verify(token, keysecret); // Replace with your JWT secret
    const validuser = await userdb.findOne({
      _id: decodedToken._id,
      "tokens.token": token,
    });

    if (!validuser) {
      return res.status(404).send('User not found');
    }

    const userData = {
      left: validuser.left,
      right: validuser.right,
      Voice: validuser.Voice,
    };

    res.status(200).json(userData);
  } catch (e) {
    res.status(400).send('Invalid token');
  }
});

router.delete('/deleteUser/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID and delete them
    const deletedUser = await userdb.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If the user was successfully deleted
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});


router.post('/exams', async (req, res) => {
  const { Creater , title, date, startTime, endTime, questions } = req.body;
  const token = req.headers.authorization.split(" ")[1]; // Assuming Bearer token
  
  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Create a new exam document
    const newExam = new examdata({
      Creater,
      title,
      date,
      startTime,
      endTime,
      questions,
      tokens: [token], // Store the token in an array
    });

    // Save the exam to the database
    const savedExam = await newExam.save();
    
    res.status(201).json({
      message: 'Exam created successfully',
      exam: savedExam,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.put('/exams/:examId', async (req, res) => {
  const { examId } = req.params; // Get examId from URL
  const { questions } = req.body;
  console.log('Received questions:', questions); 
  const token = req.headers.authorization.split(" ")[1]; // Assuming Bearer token
  
  try {
    // Verify the token
    const decodedToken = jwt.verify(token, keysecret);

    // Find the exam and update questions
    const updatedExam = await examdata.findByIdAndUpdate(
      examId,
      { $set: { questions } },
      { new: true }
    );

    if (!updatedExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.status(200).json({
      message: 'Questions added successfully',
      exam: updatedExam,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/exams', async (req, res) => {
  const userEmail = req.query.email;

  try {
    const exams = await examdata.find({ Creater: userEmail });
    res.status(200).json({ exams });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/exams', async (req, res) => {
  const { title, email } = req.body;

  try {
    await examdata.deleteOne({ title, createdBy: email });
    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete exam' });
  }
});




router.get('/users', async (req, res) => {
  try {
      const users = await userdb.find({});
      res.status(200).json(users);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


router.get("/exams/users", async (req, res) => {
  try {
    const exams = await examdata.find();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/exams/:id', async (req, res) => {
  try {
    const exam = await examdata.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Example Express.js route
router.post("/promote-to-admin", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await userdb.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's role to admin
    user.Role = "admin";
    await user.save();

    res.status(200).json({ message: "User promoted to admin successfully" });
  } catch (error) {
    console.error("Error promoting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Route to update exam with a new user entry (name and score)
// Route to update exam with a new user entry (name and score)
router.patch('/exams/:id/add-user', async (req, res) => {
  const { name, score } = req.body;

  try {
    const exam = await examdata.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Add new user data to the Users array
    exam.Users.push({ name, score });

    // Save the updated exam
    await exam.save();

    res.json({ message: 'User data added successfully', exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/results', async (req, res) => {
  const { name } = req.query;

  // Log the request for debugging purposes
  console.log('Received query name:', name);

  // Check if the name parameter is provided
  if (!name) {
    return res.status(400).json({ message: 'Name query parameter is required' });
  }

  try {
    // Find the exam document where any user in the Users array has the specified name
    const exam = await examdata.findOne({
      'Users.name': name
    });

    // If no exam is found, respond with a 404 status
    if (!exam) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Find the specific user within the Users array
    const user = exam.Users.find(user => user.name === name);

    if (!user) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Respond with the full exam document and the specific user details
    res.json({
      exam: {
        Creater: exam.Creater,
        title: exam.title,
        date: exam.date,
        Users: [user]
      }
    });
  } catch (error) {
    // Log the error for debugging
    console.error('Server error:', error);
    // Respond with a 500 status code and error message
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



module.exports = router;
