# Grocery Store Backend

Node.js and Express.js backend API for the Grocery Store e-commerce platform.

## Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your MongoDB URI and JWT secret

# Start development server
npm run dev

# Start production server
npm start
```

## Project Structure

```
backend/
├── config/          # Database configuration
├── controllers/     # Business logic (to be implemented)
├── models/         # Mongoose schemas
├── routes/         # API routes
├── middleware/     # Authentication and other middleware
├── utils/          # Helper functions
└── server.js       # Main application file
```

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT tokens
- **cors** - Cross-origin requests
- **dotenv** - Environment variables
- **nodemon** - Development auto-reload

## Environment Setup

Create a `.env` file in the backend directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grocery_store
JWT_SECRET=your_secret_key
NODE_ENV=development
```

## Running MongoDB Locally

Using Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Or install MongoDB locally and start the service.

## API Routes

See the main [README.md](../README.md) for complete API documentation.

## Development

- Uses `nodemon` for auto-restart on file changes
- Implements JWT-based authentication
- MongoDB integration with Mongoose
- RESTful API design
