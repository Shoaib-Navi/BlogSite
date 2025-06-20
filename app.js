const express = require("express")
const app = express();
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const multer = require('multer');
const userModel = require("./models/user")
const postModel = require("./models/post")
const upload = require("./config/multerconfig");


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'public')))
app.use(cookieParser());

//Home Page
// .exec() actually executes the query and returns a Promise.
// app.get('/',async(req,res)=>{
//     const posts = await postModel.find({})  //{} means everything
//         .populate('user')
//         .exec();  //this is used to return a promise and you have the option to use it or not
//                   //as mongoose is very smart it do the work without using it 

//     //shuffle posts randomly
//     const shuffled = posts.sort(()=> Math.random() - 0.5);

//     res.render('home',{allPosts: shuffled})
// })
 
//pagination
// app.get('/', async (req, res) => {
//   const page = parseInt(req.query.page) || 1; // current page
//   const limit = 8; // posts per page

//   try {
//     //search bar to stay with text which i search
//     const searchQuery = req.query.search || '';
//     let users = [];

//     if (searchQuery) {
//       users = await userModel.find({
//       username: { $regex: searchQuery, $options: 'i' },
//      });
//     }

//     const totalPosts = await postModel.countDocuments({});
//     const totalPages = Math.ceil(totalPosts / limit);

//     const posts = await postModel.find({})
//       .populate('user')
//       .sort({ _id: -1 }) // latest posts first
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .exec();

//     res.render('home', {
//       allPosts: posts,
//       currentPage: page,
//       totalPages,
//       searchQuery: query ,
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Something went wrong while loading posts.");
//   }
// });

//2.search type
app.get('/search', async (req, res) => {
  const query = req.query.query;

  try {
    // Step 1: Find users with matching username
    const matchedUsers = await userModel.find({
      username: { $regex: query, $options: 'i' }
    });

    const userIds = matchedUsers.map(user => user._id);

    // Step 2: Find posts either by content or user
    const posts = await postModel.find({
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { user: { $in: userIds } }
      ]
    }).populate('user');

    res.render('home', {
      allPosts: posts,
      currentPage: 1,
      totalPages: 1
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


//Registeration
app.get("/register",(req,res)=>{
    res.render("index")
})
app.post("/register",async(req,res)=>{
    let {email,username,name,password,age} =req.body;

    let user =await userModel.findOne({email})
    if(user) return res.status(500).send("User already exist!");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async(err,hash)=>{
            const user = await userModel.create({
                email,
                username,
                name,
                age,
                password:hash,
            })
            const token = jwt.sign({email:email,userid:user._id},"shhhh")
            res.cookie("token",token);
            res.send("Registered!")
        })
    })
})




//login
app.get("/login",(req,res)=>{
    res.render("login")
})
app.post("/login",async(req,res)=>{
    let {email,password} =req.body;

    let user =await userModel.findOne({email});
    if(!user) return res.status(400).send("Something went wrong!");

    bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
            let token = jwt.sign({email:email,userid:user._id},"shhhh");
            res.cookie("token",token);
            res.status(200).redirect("/profile")
        }else{
            res.redirect("/login")
        }
    })
    
})




//Profile
app.get("/profile",isLoggedIn,async(req,res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate("posts")
    res.render("profile",{user})
})

app.get("/profile/upload",(req,res)=>{
    res.render('profileupload')
})

app.post("/upload",isLoggedIn,upload.single('image'),async(req,res)=>{
    let user = await userModel.findOne({email:req.user.email})
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile")
})

app.post("/post",isLoggedIn,async(req,res)=>{
    let user= await userModel.findOne({email:req.user.email});
    let {content} = req.body;

    let post= await postModel.create({
        user:user._id,
        content,
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

})

//Likes & Unlikes
app.get("/like/:id",isLoggedIn,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save();
    res.redirect("/profile")
})


//update
app.get("/edit/:id",isLoggedIn,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user")
    res.render("edit",{post})
})

app.post("/update/:id",isLoggedIn,async(req,res)=>{
    let post= await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
    res.redirect("/profile");
})

//Logout
app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect("/login")
})





//session function
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    // If no token, redirect immediately
    if (!token) {
        res.redirect("/login");
        return;
    }
    // Try to verify the token
    jwt.verify(token, "shhhh", (err, decoded) => {
        if (err) {
            res.redirect("/login");
            return;
        }
        req.user = decoded;  // decoded has userid & email
        next();
    });
}


app.listen(8080)