const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Image = require("../models/Image");
const authenticate = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const keysecret = process.env.SECRET_KEY;

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
    folder: "images",
    format: async (req, file) => "png", // supports promises as well
    public_id: (req, file) => file.originalname,
  },
});

// Initialize Multer with Cloudinary storage
const upload = multer({ storage: storage });

router.post(
  "/register",
  upload.fields([{ name: "photo" }, { name: "sign" }]),
  async (req, res) => {
    const { fname, lname, email, phone, dob, password, cpassword } = req.body;

    if (!fname || !lname || !email || !phone || !dob || !password || !cpassword) {
      return res.status(422).json({ error: "Fill all the details" });
    }

    try {
      const preuser = await User.findOne({ email: email });

      if (preuser) {
        return res.status(422).json({ error: "This Email is Already Exist" });
      } else if (password !== cpassword) {
        return res.status(422).json({ error: "Password and Confirm Password Not Match" });
      } else {
        const finalUser = new User({
          fname,
          lname,
          email,
          phone,
          dob,
          password,
          cpassword,
        });

        const storeData = await finalUser.save();

        // Handle image uploads
        const imageUploads = [];
        if (req.files && req.files.photo) {
          const photo = new Image({
            url: req.files.photo[0].path,
            user: storeData._id,
            type: 'photo'
          });
          imageUploads.push(photo.save());
        }

        if (req.files && req.files.sign) {
          const sign = new Image({
            url: req.files.sign[0].path,
            user: storeData._id,
            type: 'sign'
          });
          imageUploads.push(sign.save());
        }

        await Promise.all(imageUploads);

        return res.status(201).json({ status: 201, storeData });
      }
    } catch (error) {
      console.error("catch block error:", error);
      return res.status(422).json(error);
    }
  }
);

// User login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Fill All The Details" });
  }

  try {
    const userValid = await User.findOne({ email: email });

    if (userValid) {
      if (password !== userValid.password) {
        return res.status(422).json({ error: "Invalid Credentials" });
      }

      // Generate token
      const token = await userValid.generateAuthtoken();
 

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

// Fetch all users
router.get('/fetchusers', async (req, res) => {
  try {
    const users = await User.find({}, 'fname lname Score Cheat');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate user
router.get("/validuser", authenticate, async (req, res) => {
  try {
    console.log(req.userId);
    const ValidUserOne = await User.findOne({ _id: req.userId });
    res.status(201).json({ status: 201, ValidUserOne });
  } catch (error) {
    res.status(401).json({ status: 401, error });
    console.log(error);
  }
});

// User logout
router.get("/logout", authenticate, async (req, res) => {
  try {

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

// Send email link for password reset
router.post("/sendpasswordlink", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(401).json({ status: 401, message: "Enter Your Email" });
  }

  try {
    const userfind = await User.findOne({ email: email });

    // token generate for reset password
    const token = jwt.sign({ _id: userfind._id }, keysecret, {
      expiresIn: "120s",
    });

    const setusertoken = await User.findByIdAndUpdate(
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
          res.status(201).json({ status: 201, message: "Email Sent Successfully" });
        }
      });
    }
  } catch (error) {
    res.status(401).json({ status: 401, message: "Invalid User" });
  }
});

// Verify user for forgot password
router.get("/forgotpassword/:id/:token", async (req, res) => {
  const { id, token } = req.params;

  try {
    const validuser = await User.findOne({ _id: id, verifytoken: token });

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

// Change password
router.post("/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    const validuser = await User.findOne({ _id: id, verifytoken: token });
    const verifyToken = jwt.verify(token, keysecret);

    if (validuser && verifyToken._id) {
      const setnewuserpass = await User.findByIdAndUpdate(
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

// Promote user to admin
router.post("/promote-to-admin", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

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

// Delete user
router.delete('/deleteUser/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID and delete them
    const deletedUser = await User.findByIdAndDelete(userId);

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

// Fetch all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch images for a specific user
router.get('/:userId/images', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const images = await Image.find({ user: userId });

    if (!images) {
      return res.status(404).json({ message: "No images found for this user" });
    }

    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router; 