<?php
namespace App\Config;
use PDO;
    Class Conexao {
        private static $con = null;

        public static function getConexao() : PDO
        {
            if (self::$con === null) {
                self::$con = new PDO(
                    'mysql:host=localhost;dbname=ideaueventos_prod;charset=utf8mb4', 
                    'edu',
                    'edu',
                    [
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ
                    ]
                );
                self::$con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            }
            return self::$con;
        }
    }
?>