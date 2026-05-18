<?php

namespace App\Service;

use App\Config\Conexao;
use PDO;
use DateTime;

class UsuarioService
{
    private PDO $con;

    public function __construct()
    {
        $this->con = Conexao::getConexao();
    }

    public function cadastrarUsuario(array $params): void
    {
        if ($this->CPFJaCadastrado($params['cpf'])) {
            throw new \Exception('CPF já cadastrado.');
        }
        if ($this->emailJaCadastrado($params['email'])) {
            throw new \Exception('E-mail já cadastrado.');
        }
        $sql = 'INSERT INTO 
                    usuarios (
                        nome,
                        sobrenome,
                        email,
                        telefone,
                        cpf,
                        data_nascimento,
                        senha,
                        cargo,
                        foto_path,
                        created_at
                    ) 
                VALUES 
                    (
                        :nome,
                        :sobrenome,
                        :email,
                        :telefone,
                        :cpf,
                        :data_nascimento,
                        :senha,
                        :cargo,
                        :foto_path,
                        :created_at
                    )';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':nome', $params['nome']);
        $stmt->bindValue(':sobrenome', $params['sobrenome']);
        $stmt->bindValue(':email', $params['email']);
        $stmt->bindValue(':telefone', $params['telefone']);
        $stmt->bindValue(':cpf', $params['cpf']);
        $stmt->bindValue(':data_nascimento', null);//$params['data_nascimento']); não implementado no momento
        $stmt->bindValue(':senha', password_hash($params['senha'], PASSWORD_DEFAULT));
        $stmt->bindValue(':cargo', $params['cargo']);
        $stmt->bindValue(':foto_path', $params['foto_path']);
        $stmt->bindValue(':created_at', (new DateTime())->format('Y-m-d H:i:s'));

        $stmt->execute();
    }

    public function CPFJaCadastrado(string $cpf): bool
    {
        $sql = 'SELECT id 
                FROM usuarios  
                WHERE cpf = :cpf
                LIMIT 1';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':cpf', $cpf);

        $stmt->execute();

        return $stmt->fetch() ? true : false;
    }
    public function emailJaCadastrado(string $email): bool
    {
        $sql = 'SELECT id 
                FROM usuarios  
                WHERE email = :email
                LIMIT 1';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':email', $email);

        $stmt->execute();

        return $stmt->fetch() ? true : false;
    }
    public function realizarLogin(string $emailCPF, string $senha): object
    {
        $sql = 'SELECT * FROM usuarios WHERE email = :emailCPF OR cpf = :emailCPF LIMIT 1';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':emailCPF', $emailCPF);

        $stmt->execute();

        $user = $stmt->fetch(PDO::FETCH_OBJ);

        if (!$user) {
            throw new \Exception('E-mail ou CPF não encontrado.');
        }

        if (!password_verify($senha, $user->senha)) {
            throw new \Exception('Senha incorreta.');
        }

        unset($user->senha);
        return $user;
    }
    public function listarUsuarios(): array
    {
        $sql = 'SELECT 
                    id,
                    nome,
                    sobrenome,
                    email,
                    telefone,
                    cpf,
                    data_nascimento,
                    cargo,
                    foto_path,
                    created_at
                FROM
                    usuarios';

        $stmt = $this->con->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_OBJ);
    }

    public function retornaPorId(int $id): object
    {
        $sql = 'SELECT * FROM usuarios WHERE id = :id';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_OBJ);
    }

    public function editarUsuario(array $params): void
    {
        $sql = 'UPDATE
                    usuarios
                SET
                    nome = :nome,
                    sobrenome = :sobrenome,
                    email = :email,
                    telefone = :telefone,
                    cpf = :cpf,
                    data_nascimento = :data_nascimento,
                    cargo = :cargo,
                    foto_path = :foto_path
                WHERE
                    id = :id';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':id', $params['id'], PDO::PARAM_INT);
        $stmt->bindValue(':nome', $params['nome']);
        $stmt->bindValue(':sobrenome', $params['sobrenome']);
        $stmt->bindValue(':email', $params['email']);
        $stmt->bindValue(':telefone', $params['telefone']);
        $stmt->bindValue(':cpf', $params['cpf']);
        $stmt->bindValue(':data_nascimento', $params['data_nascimento']);
        $stmt->bindValue(':cargo', $params['cargo']);
        $stmt->bindValue(':foto_path', $params['foto_path']);

        $stmt->execute();
    }

    public function excluirUsuario(int $id): void
    {
        $sql = 'DELETE FROM usuarios WHERE id = :id';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        $stmt->execute();
    }
}