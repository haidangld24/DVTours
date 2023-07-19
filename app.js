require ("dotenv").config();
const express = require("express");
const bodyParser = require ("body-parser");
const ejs = require ("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "It's our little secret",
    resave: false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://"+process.env.USERNAME_ATLAS+":"+process.env.PASSWORD_ATLAS+"@cluster0.bktzqhe.mongodb.net/DVtoursDB");
const transactionSchema = new mongoose.Schema({
    customerID: String,
    tourId: String,
    purchase_date: Date,
    purchase_date_string: String,
    slots : Number
});

const userSchema = new mongoose.Schema({
    password: String,
    googleId:String,
    isAdmin: { type: Boolean, default: false },
    transactions:[transactionSchema]
});

const tourSchema = new mongoose.Schema({
    img_path: String,
    tour_name: String,
    destination: String,
    type: String,
    date: Date,
    date_string: String,
    days: String,
    max_slots: Number,
    available_slots: Number,
    price: Number,
    transactions:[transactionSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Tour =  mongoose.model("Tour", tourSchema);
const Transaction =  mongoose.model("Transaction", transactionSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        googleId: user.googleId
      });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://dvtours.onrender.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: profile._json.email }, function (err, user) {
      return cb(err, user);
    });
  }
));

/*===================================HANDLE REQUESTS================================ */
app.get("/", function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let isAdmin = false;
    let domesticTours = [];
    let outboundTours = [];

    if(isAuthenticated){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            } else{
                let isAdmin = foundUser.isAdmin;
                Tour.find({type: "tour-trong-nuoc"}).sort({date: 'desc'}).limit(8).exec((err,foundTours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        domesticTours = foundTours;
                        Tour.find({type : "tour-nuoc-ngoai"}).sort({date: 'desc'}).limit(8).exec((err,tours)=>{
                            if (err) {
                                console.log(err);
                            } else {
                                outboundTours = tours;
                                res.render("home",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                                    domesticTours : domesticTours, outboundTours : outboundTours });
                            }
                        });
                    }
                });
                
            }
        })
    } else {
        //render trường hợp chưa đăng nhập
        Tour.find({type: "tour-trong-nuoc"}).sort({date: 'desc'}).limit(8).exec((err,foundTours)=>{
            if (err) {
                console.log(err);
            } else {
                domesticTours = foundTours;
                Tour.find({type : "tour-nuoc-ngoai"}).sort({date: 'desc'}).limit(8).exec((err,tours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        outboundTours = tours;
                        res.render("home",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                            domesticTours : domesticTours, outboundTours : outboundTours });
                    }
                });
            }
        });
    }
});


app.get("/tours/tour-trong-nuoc/:page",function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let isAdmin = false;
    let domesticTours = [];
    let perPage = 12;
    let prevPage, nextPage = 0;
    const page = Number(req.params.page);
    let totalPages = 0;
    let skipPages = Math.max((page-1)*perPage,0);

    if(isAuthenticated){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            } else{
                let isAdmin = foundUser.isAdmin;
                Tour.find({type: "tour-trong-nuoc"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        domesticTours = foundTours;
                        // TÌM SỐ PAGES PHẢI TẠO
                        Tour.find({type : "tour-trong-nuoc"}, function (err,allTours) {
                            if (err) {
                                console.log(err);
                            } else {
                                if(allTours.length%perPage === 0 ){
                                    totalPages = allTours.length/perPage ;
                                } else {
                                    totalPages = Math.floor(allTours.length/perPage) + 1;

                                }
                                // TÌM PREV PAGE
                                if (page <= 1) {
                                    prevPage = 1;
                                } else {
                                    prevPage = page - 1;
                                }
                                // TÌM NEXT PAGE
                                if (page >= totalPages) {
                                    nextPage = totalPages;
                                } else {
                                    nextPage = page + 1;
                                }
                                res.render("domesticTours",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                                    domesticTours : domesticTours,
                                    page: page,
                                    prevPage : prevPage,
                                    nextPage : nextPage,
                                    totalPages : totalPages
                                });
                            }
                        });
                        
                    }
                });
                
            }
        })
    } else {
        //render trường hợp chưa đăng nhập
        Tour.find({type: "tour-trong-nuoc"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
            if (err) {
                console.log(err);
            } else {
                domesticTours = foundTours;
                // TÌM SỐ PAGES PHẢI TẠO
                Tour.find({type : "tour-trong-nuoc"}, function (err,allTours) {
                    if (err) {
                        console.log(err);
                    } else {
                        if(allTours.length%perPage === 0 ){
                            totalPages = allTours.length/perPage ;
                        } else {
                            totalPages = Math.floor(allTours.length/perPage) + 1;
                        }
                        // TÌM PREV PAGE
                        if (page <= 1) {
                            prevPage = 1;
                        } else {
                            prevPage = page - 1;
                        }
                        // TÌM NEXT PAGE
                        if (page >= totalPages) {
                            nextPage = totalPages;
                        } else {
                            nextPage = page + 1;
                        }
                        res.render("domesticTours",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                            domesticTours : domesticTours,
                            page: page,
                            prevPage : prevPage,
                            nextPage : nextPage,
                            totalPages : totalPages
                        });
                    }
                });
                
            }
        });
    }
});

app.get("/tours/tour-nuoc-ngoai/:page",function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let isAdmin = false;
    let outboundTours = [];
    let perPage = 12;
    let prevPage, nextPage = 0;
    const page = Number(req.params.page);
    let totalPages = 0;
    let skipPages = Math.max((page-1)*perPage,0);

    if(isAuthenticated){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            } else{
                let isAdmin = foundUser.isAdmin;
                Tour.find({type: "tour-nuoc-ngoai"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        outboundTours = foundTours;
                        // TÌM SỐ PAGES PHẢI TẠO
                        Tour.find({type : "tour-nuoc-ngoai"}, function (err,allTours) {
                            if (err) {
                                console.log(err);
                            } else {
                                if(allTours.length%perPage === 0 ){
                                    totalPages = allTours.length/perPage ;
                                } else {
                                    totalPages = Math.floor(allTours.length/perPage) + 1;
                                }
                                // TÌM PREV PAGE
                                if (page <= 1) {
                                    prevPage = 1;
                                } else {
                                    prevPage = page - 1;
                                }
                                // TÌM NEXT PAGE
                                if (page >= totalPages) {
                                    nextPage = totalPages;
                                } else {
                                    nextPage = page + 1;
                                }
                                res.render("outboundTours",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                                    outboundTours : outboundTours,
                                    page: page,
                                    prevPage : prevPage,
                                    nextPage : nextPage,
                                    totalPages : totalPages
                                });
                            }
                        });
                        
                    }
                });
                
            }
        })
    } else {
        //render trường hợp chưa đăng nhập
        Tour.find({type: "tour-nuoc-ngoai"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
            if (err) {
                console.log(err);
            } else {
                outboundTours = foundTours;
                // TÌM SỐ PAGES PHẢI TẠO
                Tour.find({type : "tour-nuoc-ngoai"}, function (err,allTours) {
                    if (err) {
                        console.log(err);
                    } else {
                        if(allTours.length%perPage === 0 ){
                            totalPages = allTours.length/perPage ;
                        } else {
                            totalPages = Math.floor(allTours.length/perPage) + 1;
                        }
                        // TÌM PREV PAGE
                        if (page <= 1) {
                            prevPage = 1;
                        } else {
                            prevPage = page - 1;
                        }
                        // TÌM NEXT PAGE
                        if (page >= totalPages) {
                            nextPage = totalPages;
                        } else {
                            nextPage = page + 1;
                        }
                        res.render("outboundTours",{isAuthenticated: isAuthenticated, isAdmin: isAdmin, 
                            outboundTours : outboundTours,
                            page: page,
                            prevPage : prevPage,
                            nextPage : nextPage,
                            totalPages : totalPages
                        });
                    }
                });
                
            }
        });
    }
});


app.get("/login", function(req,res){
    let errors = [];
    let isAuthenticated = req.isAuthenticated();
    //NẾU ĐÃ ĐĂNG NHẬP THÌ QUAY VỀ "/"
    if(isAuthenticated)
    {
        res.redirect("/");
    } else {
        res.render("login",{errors :errors});
    }
});

app.post("/login", function(req,res){

    let errors = [];
    User.findOne({username: req.body.username}, function(err, foundUser){
        if(foundUser){
            const user = new User({
                username : req.body.username,
                password : req.body.password
            });
            passport.authenticate("local", function(err,user){
                if(err){
                    errors.push(err);
                    res.render("login",{errors : errors});
                } else {              
                    if(user){
                        req.login(user, function(err){
                            res.redirect("/");
                        })
                    } else {
                        errors.push("Wrong password");
                        res.render("login",{errors : errors});
                    }
                }
            })(req,res);
        }else {
            errors.push(" no username is found");
            res.render("login",{errors : errors});
        }
    });

});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile","email"] })
);
app.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        res.redirect("/");
});

app.get("/logout", function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

app.get("/register", function(req,res){
    let errors = [];
    let isAuthenticated = req.isAuthenticated();
    //NẾU ĐÃ ĐĂNG NHẬP THÌ QUAY VỀ "/"
    if(isAuthenticated)
    {
        res.redirect("/");
    } else {
        res.render("register",{errors:errors});
    }
});

app.post("/register",function(req,res){
    let errors = [];
    User.register({username: req.body.username}, req.body.password, function(err,user){
        if(err){
            errors.push(err);
            res.render("register",{errors:errors})
        } else {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            })
        }
    });
})


app.get("/admin/add-tour",function(req,res){
    let messages = [];
    let errors = [];
    let isAuthenticated = req.isAuthenticated();
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                res.render("addTour",{messages:messages, errors : errors});
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});
app.post("/admin/add-tour",function(req,res){
    let messages = [];
    let errors = [];
    let date = new Date(req.body.date);
    let d = date.getDate();
    let m = date.getMonth()+1;
    let y = date.getFullYear();
    let tour_date = d+"/"+m+"/"+y;
    let isAuthenticated = req.isAuthenticated();
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                const tour = new Tour({
                    img_path: "../../images/"+req.body.destination+".jpg",
                    tour_name: req.body.name,
                    destination: req.body.destination,
                    type: req.body.type,
                    date: req.body.date,
                    date_string: tour_date,
                    days: req.body.days,
                    max_slots: req.body.slots,
                    available_slots: req.body.slots,
                    price: req.body.price
                });
                tour.save();
                messages.push("successfully added");
                res.render("addTour",{messages:messages, errors : errors});
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/admin/all-tours/tour-trong-nuoc/:page",function(req,res){
    let domesticTours = [];
    let isAuthenticated = req.isAuthenticated();
    let perPage = 8;
    let prevPage, nextPage = 0;
    const page = Number(req.params.page);
    let totalPages = 0;
    let skipPages = Math.max((page-1)*perPage,0);
    
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                Tour.find({type: "tour-trong-nuoc"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        domesticTours = foundTours;
                        // TÌM SỐ PAGES PHẢI TẠO
                        Tour.find({type : "tour-trong-nuoc"}, function (err,allTours) {
                            if (err) {
                                console.log(err);
                            } else {
                                if(allTours.length%perPage === 0 ){
                                    totalPages = allTours.length/perPage ;
                                } else {
                                    totalPages = Math.floor(allTours.length/perPage) + 1;
                                }
                                // TÌM PREV PAGE
                                if (page <= 1) {
                                    prevPage = 1;
                                } else {
                                    prevPage = page - 1;
                                }
                                // TÌM NEXT PAGE
                                if (page >= totalPages) {
                                    nextPage = totalPages;
                                } else {
                                    nextPage = page + 1;
                                }
                                res.render("allDomesticTours",{isAuthenticated: isAuthenticated, 
                                    domesticTours : domesticTours,
                                    page: page,
                                    perPage : perPage,
                                    prevPage : prevPage,
                                    nextPage : nextPage,
                                    totalPages : totalPages
                                });
                            }
                        });
                        
                    }
                });
                
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/admin/all-tours/tour-nuoc-ngoai/:page",function(req,res){
    let outboundTours = [];
    let isAuthenticated = req.isAuthenticated();
    let perPage = 8;
    let prevPage, nextPage = 0;
    const page = Number(req.params.page);
    let totalPages = 0;
    let skipPages = Math.max((page-1)*perPage,0);
    
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                Tour.find({type: "tour-nuoc-ngoai"}).sort({date: 'desc'}).limit(perPage).skip(skipPages).exec((err,foundTours)=>{
                    if (err) {
                        console.log(err);
                    } else {
                        outboundTours = foundTours;
                        // TÌM SỐ PAGES PHẢI TẠO
                        Tour.find({type : "tour-nuoc-ngoai"}, function (err,allTours) {
                            if (err) {
                                console.log(err);
                            } else {
                                if(allTours.length%perPage === 0 ){
                                    totalPages = allTours.length/perPage ;
                                } else {
                                    totalPages = Math.floor(allTours.length/perPage) + 1;
                                }
                                // TÌM PREV PAGE
                                if (page <= 1) {
                                    prevPage = 1;
                                } else {
                                    prevPage = page - 1;
                                }
                                // TÌM NEXT PAGE
                                if (page >= totalPages) {
                                    nextPage = totalPages;
                                } else {
                                    nextPage = page + 1;
                                }
                                res.render("allOutboundTours",{isAuthenticated: isAuthenticated, 
                                    outboundTours : outboundTours,
                                    page: page,
                                    perPage : perPage,
                                    prevPage : prevPage,
                                    nextPage : nextPage,
                                    totalPages : totalPages
                                });
                            }
                        });
                        
                    }
                });
                
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/admin/delete/tour-trong-nuoc/:tourId",function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let userId = "";
    let tourId = "";
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                //XÓA TOUR THÌ PHẢI XÓA LUÔN CÁC TRANSACTION CÓ TRONG USER ĐÃ MUA TOUR, TRANSACTION ĐÃ TẠO
                //KHÔNG CẦN XÓA TRANSACTION TRONG TOUR VÌ OBJECT TOUR BỊ XÓA THÌ TRANSACTIONS CŨNG BỊ XÓA
                Tour.findById(req.params.tourId, function(err, foundTour){
                    //KIỂM TRA TOUR CÓ AI MUA KHÔNG, CÓ THÌ XÓA TRANSACNTION TRONG USER.TRANSACTIONS VÀ TRANSACTION TRONG TRANSACTIONS
                    if(foundTour.transactions.length){
                        foundTour.transactions.forEach(function(transaction){
                            Transaction.findById(transaction.id, function (err,foundTransaction) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    userId = foundTransaction.customerID;
                                    tourId = foundTransaction.tourId;
                                    User.findOneAndUpdate({_id : userId},
                                        {$pull: {transactions:{_id: transaction.id}}},
                                        function(err, foundUser){
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                Transaction.findByIdAndDelete(transaction.id, function (err) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        Tour.findByIdAndDelete(req.params.tourId, function(err){
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                res.redirect("/admin/all-tours/tour-trong-nuoc/1");
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });                 
                                }
                            });
                        });
                    //KHÔNG AI MUA THÌ CỨ XÓA TOUR 
                    } else {
                        Tour.findByIdAndDelete(req.params.tourId, function(err){
                            if (err) {
                                console.log(err);
                            } else {
                                res.redirect("/admin/all-tours/tour-trong-nuoc/1");
                            }
                        });
                    }
                });  
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/admin/delete/tour-nuoc-ngoai/:tourId",function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let userId = "";
    let tourId = "";
    if(isAuthenticated){
        User.findById(req.user.id, function(err,foundUser){
            if(foundUser.isAdmin === true){
                Tour.findById(req.params.tourId, function(err, foundTour){
                    //TOUR CÓ NGƯỜI MUA THÌ TÌM TRANSACTION TRONG USER MUA VÀ TRONG TRANSACTIONS ĐỂ XÓA RỒI MỚI XÓA TOUR
                    if(foundTour.transactions.length){
                        foundTour.transactions.forEach(function(transaction){
                            Transaction.findById(transaction.id, function (err,foundTransaction) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    userId = foundTransaction.customerID;
                                    tourId = foundTransaction.tourId;
                                    User.findOneAndUpdate({_id : userId},
                                        {$pull: {transactions:{_id: transaction.id}}},
                                        function(err, foundUser){
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                Transaction.findByIdAndDelete(transaction.id, function (err) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        Tour.findByIdAndDelete(req.params.tourId, function(err){
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                res.redirect("/admin/all-tours/tour-nuoc-ngoai/1");
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });                 
                                }
                            });
                        });
                    //TOUR KHÔNG AI MUA XÓA BÌNH THƯỜNG
                    } else {
                        Tour.findByIdAndDelete(req.params.tourId, function(err){
                            if (err) {
                                console.log(err);
                            } else {
                                res.redirect("/admin/all-tours/tour-nuoc-ngoai/1");
                            }
                        });
                    }
                });
            } else {
                res.redirect("/");
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/admin/customer-list/:tourId",function(req,res){
    // KIỂM TRA ĐĂNG NHẬP CHƯA , req.user.isAdmin CÓ BẰNG TRUE KHÔNG
    // SAI THÌ REDIRECT VỀ "/"
    // ĐÚNG THÌ FINDBYID TOUR, TRẢ VỀ TẤT CẢ TRANSACTION CỦA TOUR ĐÓ
        // FOREACH TRANSACTION THÌ TÌM CÁC USER MUA TOUR ĐÓ BẰNG USERID LƯU TRONG TRANSACTION
        //PUSH USER ĐÓ VÀ PURCHASED_USERS. NẾU PURCHASED_USERS.LENGTH = SỐ foundTOur.TRANSACTIONS.LENGTH THÌ RENDER
    const isAuthenticated = req.isAuthenticated();
    let purchased_users = [];
    if (isAuthenticated) {
        if (req.user.isAdmin) {
            Tour.findById(req.params.tourId, function(err,foundTour){
                if(err){
                    console.log(err);
                } else {
                    //TOUR CHƯA CÓ NGƯỜI MUA THÌ VÂN PHẢI RENDER TRANG TRẮNG
                    if (foundTour.transactions.length === 0) {
                        res.render("customer-list",{transactions:foundTour.transactions, 
                            purchased_users:purchased_users,
                            tour: foundTour});
                    }else {
                        foundTour.transactions.forEach(function (transaction) {
                            User.findById(transaction.customerID, function (err,foundUser) {
                                purchased_users.push(foundUser);
                                if(foundTour.transactions.length === purchased_users.length){
                                    res.render("customer-list",{transactions:foundTour.transactions, 
                                        purchased_users:purchased_users,
                                        tour: foundTour});
                                }
                            });
                        });
                    }          
                }
            });
        } else{
            res.redirect("/");
        }
    } else{
        res.redirect("/");
    }

});

app.get("/admin/transaction/delete/:transId", function(req,res){
    //TRANSACTION CÓ TRONG USER,TOUR VÌ THẾ:
        //PULL XÓA TRANSACTION TRONG USER CÓ USERID TRONG TRANSACTION BẰNG FINDONEANDUPDATE ({PULL})
        // CỘNG LẠI AVAILABLE SLOTS CỦA TOUR VỚI SỐ PURCHASED SLOTS TRONG TRANSACTION ĐỊNH XÓA
        //PUL XÓA TRANSACTION TRONG TOUR CÓ TOURID TRONG TRANSACTION BẰNG FINDONEANDUPDATE ({PULL})
        //XÓA TRANSACTION FINDBYIDANDDELETEE(), REDIRECT(/admin/customer-list/:tourId)-TOURID CÓ TRONG TRANSACTION
    const isAuthenticated = req.isAuthenticated();
    let userId = "";
    let tourId = "";
    if (isAuthenticated) {
        if(req.user.isAdmin){
            Transaction.findById(req.params.transId, function (err,foundTransaction) {
                if (err) {
                    console.log(err);
                } else {
                    userId = foundTransaction.customerID;
                    tourId = foundTransaction.tourId;
                    User.findOneAndUpdate({_id : userId},
                        {$pull: {transactions:{_id: req.params.transId}}},
                        function(err, foundUser){
                            if (err) {
                                console.log(err);
                            } else {
                                Tour.findOneAndUpdate({_id: tourId},
                                    {$pull : {transactions:{_id:req.params.transId}}},
                                    function (err,foundTour) {
                                        if (err) {
                                            console.log(err);
                                        } else{
                                            foundTour.available_slots += foundTransaction.slots;
                                            foundTour.save();
                                            Transaction.findByIdAndDelete(req.params.transId, function (err) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    res.redirect("/admin/customer-list/"+tourId);
                                                }
                                            })
                                        }
                                    });
                            }
                        });                 
                }
            });
        } else {
            res.redirect("/");
        }
    } else {
        res.redirect("/");
    }
});

app.get("/user/buy-tour/:tourId",function(req,res){
    let isAuthenticated = req.isAuthenticated();
    const tourId = req.params.tourId;
    let errors = [];
    let messages = [];
    if(isAuthenticated){
        const userId = req.user.id;
        const isAdmin = req.user.isAdmin;
        Tour.findById(tourId,function(err,foundTour){
            if (err) {
                console.log(err);
            } else {
                User.findById(userId,function(err,foundUser){
                    if (err) {
                        console.log(err);
                    } else {
                        res.render("buyTour",{tour: foundTour, user : foundUser,
                            isAdmin: isAdmin, 
                            errors : errors,
                            messages : messages,
                            isAuthenticated:isAuthenticated});
                    }
                })
            }
        })
    } else {
        res.redirect("/login");
    }
});

app.post("/user/buy-tour/:tourId",function(req,res){
    // KIỂM TRA CÓ ĐĂNG NHẬP CHƯA NẾU CHƯA RREDIRECT VỀ "/login"
    // CẦN ISADMIN ĐỂ RENDER
    // NẾU ĐÃ ĐĂNG NHẬP TÌM TOUR BẰNG TOUR ID, SO SANH AVAILABLE SLOTS CÓ < HƠN SLOTS CẦN MUA KHÔNG
        // NẾU BÉ HƠN PUSH LỖI "nOT ENOUGH SLOTS" VÀO ERRORS
        // KHÔNG THÌ TẠO TRANSACTION, SAVE() TRANSACTION, PUSH VÀO FOUNDTOUR.TRANSACTIONS, AVAILABLE_SLOTS - SLOTS MUA VÀ SAVE() FOUNDTOUR
            // TÌM USER BẰNG REQ.USER.ID
                // PUSH VÀO FOUNDTOUR.TRANSACTIONS VÀ SAVE() FOUNDUSER
                // PUSH MESSAGES "SUCESSFULLY purchased " VÀ RENDER TRANG BUYTOUR
    let isAuthenticated = req.isAuthenticated();
    let errors = [];
    let messages = [];
    const tourId = req.params.tourId;
    const userId = req.user.id;
    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    if(isAuthenticated){
        const isAdmin = req.user.isAdmin;
        User.findById(userId, function(err,foundUser){
            if (err) {
                console.log(err);
            } else {
                Tour.findById(tourId, function(err,foundTour){
                    if(err){
                        console.log(err);
                    } else {
                        if(Number(req.body.slots) > foundTour.available_slots){
                            errors.push("Not enough slots");
                            res.render("buyTour",{tour: foundTour, user : foundUser,
                                isAdmin: isAdmin, 
                                errors : errors,
                                messages : messages,
                                isAuthenticated:isAuthenticated});
                        } else {
                            const transaction = new Transaction({
                                customerID: userId,
                                tourId: tourId,
                                purchase_date: date,
                                purchase_date_string: day+"/"+month+"/"+year,
                                slots : Number(req.body.slots)
                            });
                            transaction.save();
                            foundTour.transactions.push(transaction);
                            foundTour.available_slots -= req.body.slots;
                            foundTour.save();
                            
                            foundUser.transactions.push(transaction);
                            foundUser.save();
                            messages.push("Sucessfully purchased ");
                            res.render("buyTour",{tour: foundTour, user : foundUser,
                                isAdmin: isAdmin, 
                                errors : errors,
                                messages : messages,
                                isAuthenticated:isAuthenticated});                            
                        }
                    }
                });
            }
        });
        
    } else {
        res.redirect("/login");
    }
});



app.get("/user/my-tours",function(req,res){
    //KIỂM TRA CÓ ĐĂNG NHẬP CHƯA
        //NẾU CHƯA THÌ REDIRECT ("/")
        // LÀ USER THÌ TÌM TẤT CẢ CÁC TOUR CÓ TOURID TRONG USER.TRANSACTIONS, PUSH FOUNDTOUR VÀO PURCHASED_TOURS 
        // PUSH SỐ SLOTS MUA GHI TRONG  MỖI TRANSACTION VÀO ARRAY purchased_slots. VÌ MỖI TRANSACTION CÓ 1 TOUR VÀ CŨNG 
        // CÓ SỐ SLOT MUA LÀ 1, NÊN INDEEX CỦA purchased_slots VÀ purchased_tours BẰNG NHAU
        // NÊN KHI RENDER GỌI purchased_slots[index] THÌ SẼ TRẢ VỀ SỐ SLOT ĐÃ MUA CỦA TOUR ĐÓ
        //DO HÀM FIND LÀ ASYNC FUNCTION NÊN PHẢI NHÉT RES.RENDER VÀO FIND CUỐI CÙNG LÀ FIND TOUR
        // KIỂM TRA (purchased_tours.length === foundUser.transactions.length) TỨC LÀ ĐÃ PUSH HẾT TOUR RỒI THÌ RENDER
    // CHƯA MUA TOUR NÀO THÌ VẪN PHẢI RENDER TRANG TRẮNG, VÌ NẾU KHÔNG XỬ LÝ TRƯỜNG HỢP NÀY THÌ KHI USER.TRANSACTIONS = 0
    //THÌ CHẠY FOREACH SẼ BỊ TREO DO (purchased_tours.length === foundUser.transactions.length) LUÔN KHÁC NHAU HOẶC DO PUSH NULL 
    //VÀO purchased_slots.push(transaction.slots)
    let isAuthenticated = req.isAuthenticated();
    const purchased_slots = [];
    const purchased_tours = [];
    const purchased_date = [];
    if(isAuthenticated){
        const userId = req.user.id;
        User.findById(userId, function(err,foundUser){
            if (err) {
                console.log(err);
            } else {
                // CHƯA MUA TOUR NÀO THÌ VẪN PHẢI RENDER TRANG TRẮNG
                if (foundUser.transactions.length === 0){
                    res.render("myTours", {purchased_slots : purchased_slots,
                        purchased_tours :purchased_tours,
                        purchased_date : purchased_date});
                } else {
                    foundUser.transactions.forEach(function(transaction){
                        Tour.findById(transaction.tourId, function (err,foundTour) {
                            if (err) {
                                console.log(err);
                            } else {
                                purchased_tours.push(foundTour);
                                purchased_slots.push(transaction.slots);
                                purchased_date.push(transaction.purchase_date_string)
                                if (purchased_tours.length === foundUser.transactions.length) {
                                    res.render("myTours", {purchased_slots : purchased_slots,
                                         purchased_tours :purchased_tours,
                                         purchased_date : purchased_date});
                                }
                            }                      
                        });
                    });
                }
            }
        })
    } else {
        res.redirect("/");
    }
});

app.get("/tours/:type/:destination/:tourId", function(req,res){
    let isAuthenticated = req.isAuthenticated();
    let isAdmin = false;
    if (isAuthenticated){
        isAdmin = req.user.isAdmin;
        const view_path = "./tours/"+req.params.type+"/"+req.params.destination;
        Tour.findById(req.params.tourId, function(err,foundTour){
            res.render(view_path,{tour:foundTour, isAuthenticated : isAuthenticated, isAdmin:isAdmin});
    });
    } else {
        const view_path = "./tours/"+req.params.type+"/"+req.params.destination;
        Tour.findById(req.params.tourId, function(err,foundTour){
            res.render(view_path,{tour:foundTour, isAuthenticated : isAuthenticated, isAdmin:isAdmin});
    });
    } 
});


app.listen(3000, function(){
    console.log("Server started on port 3000.");
})
