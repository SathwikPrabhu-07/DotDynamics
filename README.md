# DotDynamics  
### Transforming Physics Word Problems into Interactive Simulations

---

## 1. Project Description

### Problem Statement

Understanding physics through word problems requires students to mentally visualize abstract motion, forces, and relationships between physical quantities. Traditional textbooks and static diagrams often fail to provide dynamic, interactive insight into motion, energy transformations, and optical behavior.

This limitation creates conceptual gaps, particularly in mechanics and wave-based systems.

---

### Proposed Solution

DotDynamics is an interactive physics visualization platform that converts natural language physics word problems into real-time computational simulations.

The system:

- Parses physics word problems  
- Extracts key physical parameters  
- Classifies the type of motion  
- Generates mathematically accurate simulations  
- Displays real-time graphs and energy transformations  
- Enables dynamic parameter manipulation  

Instead of memorizing equations, users can observe physics in motion.

---

## 2. Supported Simulation Engines

DotDynamics currently supports the following physics domains:

- Vertical Motion  
- Projectile Motion  
- Simple Harmonic Motion (SHM)  
- Circular Motion  
- Inclined Plane Motion  
- Rotational Mechanics  
- Ray Optics (Mirrors & Lenses)  

Each engine is independently modeled using analytical physics equations and rendered through dynamic visualization logic.

---

## 3. System Architecture

DotDynamics follows a modular three-layer architecture:

User
↓
React Frontend (Visualization Layer)
↓
Node.js Backend (Problem Parsing API)
↓
Firebase Services (Authentication & Database)



- **Frontend** handles UI, simulation rendering, and graph generation.  
- **Backend** processes and classifies natural language physics problems.  
- **Firebase** manages authentication and cloud-based simulation storage.

### Architecture Diagram

(Add architecture image inside `/assets` folder)



---

## 4. Tech Stack Used

### Frontend
- React  
- HTML5 Canvas  
- Tailwind CSS  

### Backend
- Node.js  
- Express.js  

### Database
- Firebase Firestore  

### Authentication
- Firebase Google Authentication  


## 5. Key Features

- Natural language physics problem parsing  
- Real-time simulation rendering  
- Analytical equation-based computation  
- Dynamic graph generation  
- Universal energy visualization system  
- Live parameter manipulation  
- Secure Google authentication  
- Cloud-based simulation history  

---

## 6. How to Run the Project

### Step 1: Clone Repository

git clone <repository-url>
cd DotDynamics


### Step 2: Install Frontend Dependencies

npm install


### Step 3: Start Frontend

npm run dev


### Step 4: Start Backend

cd backend
npm install
npm run dev


Backend runs on:
http://localhost:5000


Frontend runs on:
http://localhost:8080


---

## 7. Environment Setup

To run the project successfully:

1. Create a Firebase project.
2. Enable:
   - Firestore Database  
   - Google Authentication  
3. Add Firebase configuration in:

src/firebaseConfig.js


4. Ensure backend API URL matches frontend configuration.

---

## 8. Dependencies

Major dependencies include:

- react  
- firebase  
- express  
- node  

Refer to `package.json` for the complete dependency list.

---

## 9. Important Instructions

- Do not commit `.env` files.
- Ensure Firebase configuration is properly set before running.
- Backend must be running for problem parsing to function.
- Node.js version 16+ is recommended.
- Use latest Chrome or Edge browser for best performance.
- Configure Firestore rules to allow authenticated access.

---

## 10. Demo Video and Images (MVP)

DriveLink:https://drive.google.com/drive/folders/1_OLkIg4tR6wjNS6ayEeJkrslzs1w1bYM?usp=sharing



## 11. Future Scope

- Air resistance modeling  
- Damped oscillation systems  
- Advanced optical simulations  
- Comparative multi-simulation mode  
- Exportable graph reports  
- Classroom collaboration features  

---

## 12. Conclusion

DotDynamics demonstrates how computational physics, real-time rendering, and structured system architecture can bridge the gap between theoretical equations and conceptual understanding.

It transforms static word problems into dynamic, interactive learning experiences.
This version is:
