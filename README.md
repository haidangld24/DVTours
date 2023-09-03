# DVTours (Nodejs & Express backend tour booking website)

This is a backend project for a tour booking website built with Nodejs, Express and MongoDB.

## Main Features
- User authentication with Passport local strategy and Google OAuth
- Admin can manage tours, add/delete tours
- Users can view tour listings, book tours, view their booked tours  
- Pagination for tour listings
- Responsive UI built with EJS

## Database
The app uses MongoDB database with 3 collections:

1. Users 
- Stores user info like username, password, google id
- Embedded documents for booked tours 

2. Tours
- Stores tour info and properties
- Embedded documents for booked instances

3. Transactions
- Stores booking instances with user, tour references

And Connected to MongoDB cloud hosted on Atlas

## Test Credentials
- Default test user:
  - Email: user1@email.com
  - Password: 123456
  
- Default admin:
  - Username: admin
  - Password: 123456

## Run locally
1. Add .env file with MONGO_URL
2. Run `npm install`
3. Run `nodemon app.js` 
4. visit [http://localhost:3000 ↗](http://localhost:3000)
