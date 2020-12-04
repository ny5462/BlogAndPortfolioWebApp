/**
 *  server side for blog/portfolio web app
 *  @author- Nikhil Yadav
 *  @contributor- Angela Yu
 */
//jshint esversion:6
require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const GoogleStrategy= require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const cookieParser = require('cookie-parser')
const nodemailer = require('nodemailer')
const googleapis= require('googleapis')


// home page content
const homeStartingContent = "Welcome to NY BLOG! Disclaimer:NY stands for Nikhil Yadav. As a part of a journey towards fullstack" +
    " web development, i will be using this web app as a pet project. I will also be blogging about that projects that i am a part of. This is a platform, where even new users can register and blog, " +
    "and they can maintain their anonymity via google sign up. This web app is still in the process of development, new features will" +
    "be added periodically. Feel free to blog about random topics, i will be using this platform to share about things i feel strongly about!";

// about page paragraph content
const aboutContent = "Welcome! As a graduate student at RIT , i am using this platform to share some of my projects in various domains of Computer Science." +
    " I have previously worked as Machine Learning Engineer and my interests lie in the domain of data Analysis and Machine Learning . I am an AWS certified Solutions Architect. " +
    "Reading about latest technologies and working with them to keep me on my feet, allows me to expand my field of knowledge. " +
    "Besides Academics, i have tremendous interest in reading books, hence i will be reviewing books that i read and blog about topics that interest me." +
    " I also love dogs and trying out new things. As a token of appreciation for my recently acquired skills, i have built this web app to honor my fullstack" +
    " credentials. I will be using this platform to share my views on topics " +
    "that interest me and also post diaries of my personal travels and life in general"

//contact page content
const contactContent = "List of platforms to contact me. Feel free to contact if you are a recruiter and want to look at private repos";



// initialize express app
const app = express();

//setting view engine
app.set('view engine', 'ejs');

// body parser for parsing urls and texts
app.use(bodyParser.urlencoded({extended: true}));

// setting default static pages in public folder
app.use(express.static("public"));
app.set("views",__dirname+"/views")

app.use(cookieParser())

// using passport for sessions after setting secret
app.use(session({
  secret: "Our little secret yeah!.",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());


// connecting to remote database in mongodb atlas hosted on aws
mongoose.connect('mongodb+srv://admin-nikhil:ooGooLaevio9igei@cluster0.4k0ob.mongodb.net/user', {useNewUrlParser: true})
//
//
mongoose.set("useCreateIndex",true);

// setting schema of database
const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  posts:[{
    title:String,
    content:String
  }]
})




userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User= mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id);
});

passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user.id);
  })
});

// setting new google strategy for authentication via google
//
passport.use(new GoogleStrategy({
      clientID:process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://shrouded-brushlands-06052.herokuapp.com/auth/google/compose",
      userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken,profile,cb){
      User.findOrCreate({googleId: profile.id},function(err,user){
        return cb(err,user);
      })
    }))


// set for the home page
app.get("/",function(req,res){
  User.find({},function(err,users){
    console.log(users);
    res.render("home",{
      homeStartingContent:homeStartingContent,
      users:users
    })
  })

})


// reads the about page
app.get("/about",function(req,res){
  res.render("about",{
    about:aboutContent,
  })
})

// reads the contact page
app.get("/contact",function(req,res){
  res.render("contact",{
    contact:contactContent,
  })
})

// app.post('/contact', function(req, res){
//
//   // Instantiate the SMTP server
//   console.log("form transfer")
//   const smtpTrans = nodemailer.createTransport({
//       host: 'smtp.gmail.com',
//       port: 465,
//       secure: true,
//       auth: {
//         type: 'OAuth2',
//         user: process.env.USER,
//         clientId: process.env.CLIENT_ID,
//         clientSecret: process.env.CLIENT_SECRET,
//         // refreshToken: process.env.GOOGLE_CLIENT_REFRESH_TOKEN
//       }
//     });
//
//
//   // Specify what the email will look like
//   const mailOpts = {
//     from: req.body.name, // This is ignored by Gmail
//     to: process.env.USER,
//     subject: 'New message from contact form ',
//     text: `${req.body.name}  says: ${req.body.message}`
//   }
//
//   // Attempt to send the email
//   smtpTrans.sendMail(mailOpts, (error, response) => {
//     if (error) {
//       console.log(error);
//       res.send("contact-failure") // Show a page indicating failure
//     }
//     else {
//       res.send('contact-success') // Show a page indicating success
//     }
//   })
// })

// reads the compose page
app.get("/compose",function(req,res){
  if(req.isAuthenticated()) {
    console.log("authenticated")
    res.render("compose");
  }else{
    console.log(req.isAuthenticated())
    console.log("not authenticated")
    res.render("login");
    }

})
// gathers data from the compose page
app.post("/compose",function(req,res){
  const post={title:req.body.compose,
              content:req.body.post};

  console.log(req.user);
  User.findById(req.user, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        console.log("user found")
        foundUser.posts.push(post);
        foundUser.save(function(){
          res.redirect("/");
        })
      }
    }
  })
})


// reads the register page
app.get("/register",function (req, res){
  res.render("register");
})


// takes user input from register page
app.post("/register",function (req, res){
  User.register({username: req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err)
      res.redirect("/register")
    }else{
      passport.authenticate("local")(req,res,function(){
        res.render("compose");
      })
    }
  })

})


// reads google authentication
app.get("/auth/google",
    passport.authenticate("google",{scope:["profile"]}));

// if authenticated google redirects to compose
app.get("/auth/google/compose",
    passport.authenticate("google", {failureRedirect: "/login"}),
    function(err,res){
    console.log(err);
      console.log('will compose');
      res.redirect("/compose");
    })


// logout button yet to be added
app.get("/logout",function (req, res){
  req.logout();
  res.redirect("/");
})

// login page is read
app.get("/login",function (req, res){
  res.render("login");
})

// reads user input from login page
app.post("/login",function(req, res){
  const user =new User({
    email:req.body.username,
    password:req.body.password
  })
  req.login(user,function(err){
    if(err){
      console.log(err);
      res.redirect("/login")
    }else{
      passport.authenticate("local")(req,res,function(){
        console.log("passport.authenticate works")
        res.render("compose");
      })

    }
  })
})



// custom posts for every user
app.get("/posts/:userId/:postId", function(req,res){
  const writer=req.params.userId;
  const requested= req.params.postId;
  User.findOne({_id:writer, "posts._id": requested},{"posts.$": 1},function(err,post){
        console.log(post.posts[0].title);
        res.render("post",{
          title:post.posts[0].title,
          content:post.posts[0].content
        })
      })

})

// port is set
let port = process.env.PORT;
if(port == null ||port == ""){
  port=4000;
}

app.listen(port, function() {
  console.log("Server started on port 4000");
});
