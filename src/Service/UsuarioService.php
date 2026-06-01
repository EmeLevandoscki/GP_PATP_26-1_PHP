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

    public function cadastrarUsuario(array $params): int
    {   
        error_log('Cadastrando usuário: ' . print_r($params, true));
        if ($params['cargo'] === 'aluno' && ($params['cpf'] === null || $params['cpf'] === '')) {
            $cpf = '';    
        } elseif ($params['cpf'] === null || $params['cpf'] === '') {
            throw new \Exception('CPF é obrigatório.');
        } else {
            $cpf = $params['cpf'];
            if ($this->CPFJaCadastrado($cpf)) {
                throw new \Exception('CPF já cadastrado.');
            }
        }
        if ($params['email'] !== null && $params['email'] !== '') {
            if ($this->emailJaCadastrado($params['email'])) {
                throw new \Exception('E-mail já cadastrado.');
            }
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
        $stmt->bindValue(':cpf', $cpf);
        $stmt->bindValue(':data_nascimento', null);//$params['data_nascimento']); não implementado no momento
        $stmt->bindValue(':senha', password_hash($params['senha'], PASSWORD_DEFAULT));
        $stmt->bindValue(':cargo', $params['cargo']);
        $stmt->bindValue(':foto_path', $params['foto_path']);
        $stmt->bindValue(':created_at', (new DateTime())->format('Y-m-d H:i:s'));

        $stmt->execute();
        return (int) $this->con->lastInsertId();
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
    public function retornaPorCPF(string $cpf): object|null
    {
        $sql = 'SELECT * FROM usuarios WHERE cpf = :cpf';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':cpf', $cpf);

        $stmt->execute();

        $usuario = $stmt->fetch(PDO::FETCH_OBJ);
        
        return $usuario ?: null;
    }
    public function retornaPorNome(string $nome): array|null // pode haver mais de um usuário com o mesmo nome
    {
        $sql = 'SELECT * FROM usuarios WHERE nome = :nome';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':nome', $nome);

        $stmt->execute();

        $usuarios = $stmt->fetchAll(PDO::FETCH_OBJ);
        
        return $usuarios ?: null;
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
    public function verificaVinculoResponsavel(int $id_responsavel, int $id_dependente): object|null
    {
        $sql = 'SELECT id, id_dependente FROM usuarios_responsaveis WHERE id_responsavel = :id_responsavel AND id_dependente = :id_dependente LIMIT 1';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_responsavel', $id_responsavel);
        $stmt->bindValue(':id_dependente', $id_dependente);

        $stmt->execute();

        $usuarios = $stmt->fetch(PDO::FETCH_OBJ);
        return $usuarios ?: null;
    }
    public function vincularAlunoResponsavel(int $idAluno, int $idResponsavel, string $parentesco): void
    {
        $sql = 'INSERT INTO usuarios_responsaveis (id_responsavel, id_dependente, parentesco) VALUES (:id_responsavel, :id_dependente, :parentesco)';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_responsavel', $idResponsavel);
        $stmt->bindValue(':id_dependente', $idAluno);
        $stmt->bindValue(':parentesco', $parentesco);

        $stmt->execute();
    }
    public function vincularAlunoTurma(int $idAluno, string $nomeTurma): void
    {
        $sql = 'SELECT id FROM turmas WHERE nome = :nome LIMIT 1';
        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':nome', $nomeTurma);
        $stmt->execute();
        $turma = $stmt->fetch(PDO::FETCH_OBJ);
        if (!$turma) {
            throw new \Exception("Turma não encontrada");
            }
        $idTurma = $turma->id;

        //Se o usuário já estiver vinculado a essa turma, faz um update para a turma nova, caso contrário, faz um insert
        $sql = 'SELECT id FROM usuarios_turmas WHERE id_usuario = :id_usuario;';
        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_usuario', $idAluno);
        $stmt->execute();
        $vinculo = $stmt->fetch(PDO::FETCH_OBJ);
        if ($vinculo) {
            $sql = 'UPDATE usuarios_turmas SET id_turma = :id_turma WHERE id = :id';
            $stmt = $this->con->prepare($sql);
            $stmt->bindValue(':id', $vinculo->id);
            $stmt->bindValue(':id_turma', $idTurma);
        } else {
            $sql = 'INSERT INTO usuarios_turmas (id_usuario, id_turma) VALUES (:id_usuario, :id_turma)';
            $stmt = $this->con->prepare($sql);
            $stmt->bindValue(':id_usuario', $idAluno);
            $stmt->bindValue(':id_turma', $idTurma);
        }

        $stmt->execute();
    }
}