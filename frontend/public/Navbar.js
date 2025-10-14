import React from 'react';
import { Home, ClipboardList, ShoppingCart, Users, Wallet } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ currentSection, onSectionChange }) => {
  const navItems = [
    {
      id: "home",
      icon: Home,
      label: "Home",
    },
    {
      id: "tasks",
      icon: ClipboardList,
      label: "Tasks",
    },
    {
      id: "buy",
      icon: ShoppingCart,
      label: "Buy",
    },
    {
      id: "referrals",
      icon: Users,
      label: "Referrals",
    },
    {
      id: "wallet",
      icon: Wallet,
      label: "Wallet",
    },
  ];

  return (
    <nav className="bottom-navbar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentSection === item.id;

        return (
          <button 
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            <Icon className="nav-icon" strokeWidth={2.5} />
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navbar;