// Database server is now handled by Docker
// This file is kept for compatibility but no longer starts embedded PostgreSQL

console.log('⚠️  Database server functionality has been moved to Docker.');
console.log('🐳 Please use Docker Compose to start the PostgreSQL database.');
console.log('💡 Run: docker-compose up -d in the database-server directory');

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  console.log('✅ No embedded database to stop - using Docker instead');
  process.exit(0);
};

// Handle shutdown signals
const signals = process.platform === 'win32' 
  ? ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const
  : ['SIGINT', 'SIGTERM'] as const;

signals.forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// No server to start - Docker handles the database
console.log('🔄 Database server stub running (Docker mode)');
console.log('📡 Listening for shutdown signals...'); 