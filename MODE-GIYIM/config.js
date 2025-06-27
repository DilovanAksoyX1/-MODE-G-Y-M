const config = {
    server: 'DESKTOP-JUNQCK6\\SQLEXPRESS',  // SQL Server adı
    database: 'MODE_DB',   // Veritabanı adı
    options: {
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true,
        encrypt: false,
        integratedSecurity: true
    },
    driver: 'msnodesqlv8'
};

module.exports = config;
