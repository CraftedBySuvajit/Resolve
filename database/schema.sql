-- Complaint Management System - Supabase Database Schema

-- Create the complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    token VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_complaints_token ON complaints(token);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_email ON complaints(email);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
DROP TRIGGER IF EXISTS update_complaints_updated_at ON complaints;
CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON TABLE complaints TO your_user;
-- GRANT ALL PRIVILEGES ON SEQUENCE complaints_id_seq TO your_user;

-- Insert sample data for testing (optional)
INSERT INTO complaints (token, name, email, phone, category, description, status, reply)
VALUES
    ('ABC123XYZ1', 'John Doe', 'john@example.com', '1234567890', 'billing', 'Incorrect billing amount on invoice', 'resolved', 'We have corrected the billing amount. Refund has been issued.'),
    ('DEF456XYZ2', 'Jane Smith', 'jane@example.com', '0987654321', 'service', 'Poor customer service experience', 'in_progress', 'We are investigating this matter.'),
    ('GHI789XYZ3', 'Bob Johnson', 'bob@example.com', '5555555555', 'product', 'Product arrived damaged', 'pending', NULL)
ON CONFLICT (token) DO NOTHING;
