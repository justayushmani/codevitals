import express from 'express';

const app = express();

// Secret leak
const apiKey = "AIzaSyBwK2F8_abcdefghijklmnopqrstuvwxyz";

// Missing Auth on protected route
app.get('/api/protected/data', (req, res) => {
  res.json({ secret: 'data' });
});

app.get('/admin/users', (req, res) => {
  res.json({ users: [] });
});

// Dead code
export function calculateUnusedMetric(a, b) {
  console.log('Calculating...');
  return a * b;
}

export function unusedHelper() {
  return "I am never used";
}

// Dead code (arrow function)
const deadArrow = () => {
    console.log("Dead");
}

app.listen(3000, () => {
  console.log("Server running");
});
