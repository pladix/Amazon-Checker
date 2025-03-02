import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Allow only the frontend application
  methods: ['POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoint for card checking
app.post('/api/check-card', (req, res) => {
  const { card, cookie } = req.body;
  
  console.log(`Processing card: ${card}`);
  console.log(`Cookie provided: ${cookie ? 'Yes' : 'No'}`);
  
  // Simulate API processing time
  setTimeout(() => {
    // Generate random result for demonstration
    const random = Math.random();
    let response;
    
    if (random > 0.7) {
      // Live card
      response = {
        status: 'live',
        message: `Aprovada | ${card} | Bandeira: ${getRandomCardBrand()} | Banco: ${getRandomBank()}`
      };
      console.log(`Card approved: ${card}`);
    } else if (random > 0.3) {
      // Dead card
      response = {
        status: 'die',
        message: `Reprovada | ${card} | Motivo: ${getRandomDeclineReason()}`
      };
      console.log(`Card declined: ${card}`);
    } else {
      // Error
      response = {
        status: 'error',
        message: `Erro | ${card} | Motivo: ${getRandomErrorReason()}`
      };
      console.log(`Error processing card: ${card}`);
    }
    
    res.json(response);
  }, 500 + Math.random() * 300); // Simulate API delay with some variation
});

// Helper functions for random responses
function getRandomCardBrand() {
  const brands = ['Visa', 'Mastercard', 'American Express', 'Discover', 'JCB'];
  return brands[Math.floor(Math.random() * brands.length)];
}

function getRandomBank() {
  const banks = ['Banco do Brasil', 'Itaú', 'Bradesco', 'Santander', 'Nubank', 'Inter', 'Caixa', 'HSBC', 'Chase', 'Bank of America'];
  return banks[Math.floor(Math.random() * banks.length)];
}

function getRandomDeclineReason() {
  const reasons = ['Insufficient funds', 'Card expired', 'Invalid card number', 'Transaction declined', 'Do not honor', 'Restricted card'];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomErrorReason() {
  const reasons = ['Connection timeout', 'Server error', 'Gateway error', 'Invalid response', 'Network error'];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/check-card`);
  console.log(`Waiting for requests from frontend (http://localhost:5173)...`);
});