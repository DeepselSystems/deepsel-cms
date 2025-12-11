import React from 'react';

class CustomCodeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {hasError: true};
  }

  componentDidCatch(error, errorInfo) {
    // Log the error but don't crash the app
    console.warn(
      'CustomCodeInjection error caught by boundary:',
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      // Return null to render nothing instead of error UI
      return null;
    }

    return this.props.children;
  }
}

export default CustomCodeErrorBoundary;
