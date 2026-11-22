
import { testDatabaseConnection } from './config/database.js'

testDatabaseConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
