import React from 'react';

interface HeaderProps {
  activeTab: 'disponibilidad' | 'gestion';
}

export default function Header({ activeTab }: HeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
      <img src="/OA_LOGO.png" alt="Logo" style={{ height: '80px', objectFit: 'contain' }} />
      <nav className="top-menu" style={{ display: 'flex', gap: '10px' }}>
        <a 
          className={activeTab === 'disponibilidad' ? 'menu-link active' : 'menu-link'} 
          href="/" 
          style={activeTab !== 'disponibilidad' ? { textDecoration: 'none', color: '#666' } : {}}
        >
          Disponibilidad
        </a>
        <a 
          className={activeTab === 'gestion' ? 'menu-link active' : 'menu-link'} 
          href="/gestion" 
          style={activeTab !== 'gestion' ? { textDecoration: 'none', color: '#666' } : {}}
        >
          Gestión de Datos
        </a>
      </nav>
    </div>
  );
}
