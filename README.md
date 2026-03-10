---

# 🔷 DotDynamics

### Interactive Physics Simulation Platform

> Transforming physics word problems into **real-time, mathematically accurate visual simulations.**

DotDynamics is a full-stack physics simulation platform that converts natural language physics problems into **interactive visual simulations and synchronized graphs**.

Instead of solving equations on paper, students can **see physics in motion** — observing trajectories, forces, and energy transformations in real time.

---

# 🌍 Vision

Physics education often relies on static equations and diagrams that make it difficult for students to build strong intuition.

DotDynamics bridges this gap by turning **word problems into dynamic simulations**, helping learners connect mathematical equations with real physical behavior.

The platform aims to make physics **visual, interactive, and exploratory**.

---

# 🚨 Problem Statement

Students frequently struggle with:

* Visualizing motion from word problems
* Understanding vector components of forces
* Relating equations to real physical motion
* Observing energy transformations dynamically
* Connecting graphs with real motion

Traditional textbooks are **static**, while physics itself is dynamic.

DotDynamics solves this by creating an **interactive computational physics platform**.

---

# 💡 Solution

DotDynamics converts natural language physics questions into **interactive simulations powered by analytical physics equations**.

Users can:

* Visualize motion dynamically
* Observe energy transformations in real time
* Modify parameters and instantly see new results
* Generate synchronized physics graphs

This transforms physics learning from **static calculation → interactive exploration**.

---

# ⚙️ How DotDynamics Works

## 1️⃣ User Input

The user enters a physics word problem.

Example:

> "A ball is thrown at 25 m/s at 45°."

---

## 2️⃣ Backend Parsing Layer

The request is sent to the **Node.js backend**, which:

* Identifies the physics domain
* Extracts parameters (velocity, angle, mass, etc.)
* Classifies the motion type
* Returns structured simulation data

---

## 3️⃣ Physics Engine Selection

Based on the classification, the correct physics engine is selected.

Supported engines include:

* Vertical Motion Engine
* Projectile Motion Engine
* SHM Engine
* Circular Motion Engine
* Inclined Plane Engine
* Rotational Mechanics Engine
* Ray Optics Engine

Each engine is built using **analytical physics equations**.

---

## 4️⃣ Real-Time Simulation Rendering

The frontend renders simulations using **HTML5 Canvas**.

Frame-by-frame computation updates:

* position
* velocity
* acceleration
* energy

Animations are **computed live**, not pre-rendered.

---

## 5️⃣ Dynamic Graph Generation

Each simulation automatically generates synchronized graphs:

* Position vs Time
* Velocity vs Time
* Energy vs Time
* Angular motion graphs (for rotational systems)

Graphs update in real time with the simulation.

---

## 6️⃣ Universal Energy Visualization System

Mechanical systems include real-time energy tracking.

Equations used:

```
KE = ½mv²
PE = mgh
Total Energy = KE + PE
```

Students can observe **energy conservation and transformations dynamically**.

---

## 7️⃣ Parameter Manipulation

Users can adjust simulation parameters:

* Velocity
* Angle
* Mass
* Gravity
* Spring constant
* Torque
* Radius
* Friction
* Optical distances

Simulations update instantly when parameters change.

---

## 8️⃣ Firebase Integration

### 🔐 Authentication

* Google Authentication via Firebase
* Secure login system

### ☁ Cloud Database

Firestore stores:

* user profile
* saved simulations
* simulation parameters
* timestamps

---

### 📜 Simulation History

Users can:

* view saved simulations
* reload past configurations
* delete simulations

---

# 🏗 System Architecture

```
              +----------------------+
              |        User          |
              +----------+-----------+
                         |
                         |
              +----------v-----------+
              |     React Frontend   |
              | UI + Physics Canvas  |
              +----------+-----------+
                         |
                         | API Requests
                         |
              +----------v-----------+
              |     Node.js Backend  |
              |   Problem Parser API |
              +----------+-----------+
                         |
                         |
              +----------v-----------+
              |       Firebase       |
              | Auth + Firestore DB  |
              +----------------------+
```

---

# 🧩 Technology Stack

## Frontend

* React
* HTML5 Canvas
* Tailwind CSS

---

## Backend

* Node.js
* Express.js

---

## Cloud Services

* Firebase Authentication
* Firebase Firestore
* Firebase Hosting

---

# 🎯 Supported Physics Domains

## Mechanics

* Vertical Motion
* Projectile Motion
* Inclined Plane
* Circular Motion
* Rotational Mechanics
* Simple Harmonic Motion

---

## Optics

* Ray Tracing (Mirrors and Lenses)

---

# 📂 Project Demo & Screenshots

All demo videos, screenshots, and project visuals are available here:

📁 **Drive Folder**

[https://drive.google.com/drive/folders/1_OLkIg4tR6wjNS6ayEeJkrslzs1w1bYM?usp=sharing](https://drive.google.com/drive/folders/1_OLkIg4tR6wjNS6ayEeJkrslzs1w1bYM?usp=sharing)

This folder contains:

* simulation demos
* project UI screenshots
* visual explanations

---

# 🚀 Installation

## 1️⃣ Clone Repository

```
git clone https://github.com/SathwikPrabhu-07/DotDynamics
cd DotDynamics
```

---

## 2️⃣ Install Dependencies

```
npm install
```

---

## 3️⃣ Start Backend Server

```
node server.js
```

---

## 4️⃣ Start Frontend

```
npm start
```

The application will run locally on:

```
http://localhost:3000
```

---

# 🚀 Usage Workflow

### Step 1 — Login

Users sign in using **Google Authentication**.

---

### Step 2 — Enter Physics Problem

User inputs a physics word problem.

---

### Step 3 — Backend Processing

Backend extracts parameters and selects the appropriate physics engine.

---

### Step 4 — Simulation Rendering

The frontend computes motion and renders simulation using Canvas.

---

### Step 5 — Graph Generation

Real-time graphs are generated alongside the simulation.

---

### Step 6 — Parameter Adjustment

Users modify simulation parameters to explore different outcomes.

---

### Step 7 — Save Simulation

Users can store simulations in Firestore for later access.

---

# 🎯 Key Features

* Real-time physics simulation rendering
* Analytical equation-based computation
* Natural language problem interpretation
* Modular physics engine architecture
* Interactive graph visualization
* Cloud-backed simulation history
* Secure Firebase authentication
* Multi-domain physics coverage

---

# 📊 Educational Impact

DotDynamics helps students:

* build stronger physics intuition
* connect equations with real-world behavior
* visualize abstract physics concepts
* experiment interactively with parameters

It converts **static problem solving into dynamic learning**.

---

# 🧪 Future Improvements

Potential future enhancements include:

* air resistance modeling
* damped oscillations
* multi-body simulation systems
* 3D physics visualization
* comparative simulation mode
* classroom collaboration tools
* exportable graph reports

---

# 🤝 Contributing

Contributions are welcome.

Steps:

```
1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Submit a Pull Request
```

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 🏁 Project Vision

DotDynamics aims to transform physics education by making equations **visible, interactive, and exploratory** through real-time computational simulations.

---
