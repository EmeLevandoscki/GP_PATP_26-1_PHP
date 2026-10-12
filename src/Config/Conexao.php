<?php
namespace App\Config;
use PDO;
    Class Conexao {
        private static $con = null;

        public static function getConexao() : PDO
        {
            if (self::$con === null) {
                $config = DatabaseConfig::carregar();
                self::$con = new PDO(
                    'mysql:host=' . $config['host'] . ';port=' . $config['port']
                        . ';dbname=' . $config['database'] . ';charset=utf8mb4',
                    $config['username'],
                    $config['password'],
                    [
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ,
                    PDO::ATTR_EMULATE_PREPARES => false
                    ]
                );
                self::$con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            }
            return self::$con;
        }
    }
?>
