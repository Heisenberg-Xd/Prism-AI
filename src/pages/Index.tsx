import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to AI command page as the default view
    navigate('/ai');
  }, [navigate]);

  return null;
};

export default Index;
