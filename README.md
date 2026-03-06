# OurLocalMarket
<img width="1220" height="623" alt="image" src="https://github.com/user-attachments/assets/3c688bf0-f1c7-459c-b1f1-d4b9d4c735d7" />
<img width="1333" height="628" alt="image" src="https://github.com/user-attachments/assets/9ac99d8c-bdef-4454-8a68-4dcba0ec58e0" />
<img width="1356" height="621" alt="image" src="https://github.com/user-attachments/assets/790d1828-b201-4f04-be9c-54a6534c9f1c" />
<img width="1340" height="626" alt="image" src="https://github.com/user-attachments/assets/8965ed47-095d-4b22-ab0e-a9f75d116b3f" />
<img width="1328" height="625" alt="image" src="https://github.com/user-attachments/assets/0dd1ed65-cb1d-4f97-89e2-0831d6bbe4e7" />



OurLocalMarket is a currently an e-commerce working prototype in its development stage, fully functional in a local environment but not yet deployed as a public application. You can run the entire application locally by using node server.js and accessing it through http://localhost:5000. At this stage, the platform supports complete user registration, login, and role-based dashboards for both farmers and buyers—including features like product management, shopping cart, orders, and  payments. While it demonstrates the intended marketplace experience with email verification and a responsive interface, it remains a development build without live hosting, real payment processing, or public access.

## Quick start:

1. Clone
   git clone https://github.com/Nola8/OurLocalMarket.git
2. Install
   npm install
3. Start the server
   node server.js
4. Open in your browser
   http://localhost:5000

## How to use:
- To see the app: open http://localhost:5000 after running `node server.js`.

  
- TO ACCESS FARMER  DASHBOARDS

  
  -Click on "Get started " in the top navigation
  
  -Select the "Farmer" account type
  
  -Fill in your details using your real email address (verification email will be sent)
  
  -Check your email inbox for verification link
  
  -Click the verification link to activate your account
  
  -After verification, you'll be redirected to the home page
  
  -Click "Login" and enter your verified email and password
  
  -You'll be automatically directed to the Farmer Dashboard
  
- If u encounter server error during registeration check your mongoDB

- TO ACCESS BUYER DASHBOARD  , you must register with the "Buyer" account type.
- 
         - Please note that each email address can only be linked to one role—either farmer or buyer.
        - If you have previously registered as a farmer with a certain email,
           you cannot reuse that same email to register as a buyer.
  You have two options:
            -Use a different email address when registering as a buyer.
            - or Remove the existing user record from your local database(mongo DB) (by deleting the corresponding entry in the user data file)
   before reusing the same email to sign up as a buyer.

Farmer Dashboard Features:

Post Products: List new agricultural products for sale
Edit Products: Update product details, prices, or availability
Delete Products: Remove products from your listings
Profile Management: Update your personal and farm information

Buyer Dashboard Features:


Browse Products: View available products from farmers
Add to Cart: Select products and quantities for purchase
Profile Settings: Update your delivery information and preferences
Order Confirmation: Receive confirmation of your order details
Payment Method: Payment,  to the farmer at the time of delivery or pickup


## Common commands:
- Install deps: `npm install`
- Start (basic): `node server.js`
- Dev (if available): `npm run dev`


## Notes
- Port: app runs on port 5000 by default (http://localhost:5000). If your environment uses a different port, check `server.js` or `.env`.


## Contributing
- Fork → branch → PR. Keep changes small and descriptive.
> Maintained and documented by Etsub (https://github.com/Etsubbb)


