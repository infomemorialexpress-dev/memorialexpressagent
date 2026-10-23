import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    localStorage.removeItem('legacy_simple_v5');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 600,
          margin: '60px auto',
          padding: 32,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #fed7aa',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#9a3412', margin: '0 0 12px', fontSize: 20 }}>
            Application Error in Agent Quoter
          </h2>
          <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>
            A runtime error occurred while rendering the quoter component:
          </p>
          <pre style={{
            background: '#fff7ed',
            color: '#c2410c',
            padding: 16,
            borderRadius: 8,
            fontSize: 12.5,
            overflowX: 'auto',
            border: '1px solid #ffedd5'
          }}>
            {this.state.error?.toString() || 'Unknown React error'}
            {this.state.errorInfo?.componentStack}
          </pre>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#183655',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReload}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Storage & Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
