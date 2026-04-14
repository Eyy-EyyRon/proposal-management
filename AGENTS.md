Proposal Management System
Goal:
	Create a system that allows the user to create, send, track proposals and decide what to do after that.

Stack
Firebase auth for Authentication
Firestore for database
Firebase Hosting for Hosting
Firebase Storage for Storage (Needs Blaze Plan)
ReactJS or NextJS 

Note:
 Please add me (info@hyacinthindustriesllc.com) on the firebase project as owner,  to upgrade the plan to Blaze
Create git repository and add me (kirisuberu) as collaborator
Core Features
User login (email/password)
Allow uploading docx file and/or a google docs link for the proposal template
Add dynamic fields such as
Name
Email
Phone Number
Since the template is reusable, the user just needs to input the name, email, phone number, etc based on the template that the user is using, then if the required fields are filled out, then it can automatically creates a shareable link that redirects the user to a portal to check that Proposal PDF, and sign it (if they accept the terms written in the proposal) or reject it.
Add option to either use e-signature or attach an image of signature
View list of proposals
Status: Sent, Viewed, Accepted, Rejected
Add Analytics (Optimize this, to prevent spike in firestore reads)
