<?php

namespace App\Service;

use App\Model\Evento;
use App\Config\Conexao;
use PDO;
use DateTime;

class EventoService
{
    private PDO $con;

    public function __construct()
    {
        $this->con = Conexao::getConexao();
    }

    public function cadastrarEvento(array $params): void
    {
        $sql = 'INSERT INTO 
                    eventos (
                        titulo,
                        descricao,
                        valor,
                        data_inicio,
                        data_fim,
                        foto_path,
                        id_tipo,
                        id_status,
                        id_usuario,
                        id_endereco
                    ) 
                VALUES 
                    (
                        :titulo,
                        :descricao,
                        :valor,
                        :data_inicio,
                        :data_fim,
                        :foto_path,
                        :id_tipo,
                        :id_status,
                        :id_usuario,
                        :id_endereco
                    )';

        $evento = new Evento(
            null,
            $params['titulo'],
            $params['descricao'],
            (float) $params['valor'],
            new DateTime($params['data_inicio']),
            new DateTime($params['data_fim']),
            $params['foto_path'],
            (int) $params['id_tipo'],
            (int) $params['id_status'],
            (int) $params['id_usuario'],
            (int) $params['id_endereco'],
            new DateTime(),
            null
        );

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':titulo', $evento->getTitulo());
        $stmt->bindValue(':descricao', $evento->getDescricao());
        $stmt->bindValue(':valor', $evento->getValor());
        $stmt->bindValue(':data_inicio', $evento->getDataInicio()->format('Y-m-d H:i:s'));
        $stmt->bindValue(':data_fim', $evento->getDataFim()->format('Y-m-d H:i:s'));
        $stmt->bindValue(':foto_path', $evento->getFotoPath());
        $stmt->bindValue(':id_tipo', $evento->getIdTipo(), PDO::PARAM_INT);
        $stmt->bindValue(':id_status', $evento->getIdStatus(), PDO::PARAM_INT);
        $stmt->bindValue(':id_usuario', $evento->getIdUsuario(), PDO::PARAM_INT);
        $stmt->bindValue(':id_endereco', $evento->getIdEndereco(), PDO::PARAM_INT);

        $stmt->execute();
    }

    public function listarTodosEventos(): array
    {
        $sql = 'SELECT * FROM eventos';

        $stmt = $this->con->prepare($sql);
        $stmt->execute();

        $resultSet = $stmt->fetchAll(PDO::FETCH_OBJ);
        $eventos = [];

        foreach ($resultSet as $result) {
            $eventos[] = new Evento(
                $result->id,
                $result->titulo,
                $result->descricao,
                (float) $result->valor,
                new DateTime($result->data_inicio),
                new DateTime($result->data_fim),
                $result->foto_path,
                (int) $result->id_tipo,
                (int) $result->id_status,
                (int) $result->id_usuario,
                (int) $result->id_endereco,
                new DateTime($result->criado_em),
                $result->atualizado_em ? new DateTime($result->atualizado_em) : null
            );
        }

        return $eventos;
    }

    public function editarEvento(array $params): void
    {
        $sql = 'UPDATE
                    eventos
                SET
                    titulo = :titulo,
                    descricao = :descricao,
                    valor = :valor,
                    data_inicio = :data_inicio,
                    data_fim = :data_fim,
                    foto_path = :foto_path,
                    id_tipo = :id_tipo,
                    id_status = :id_status,
                    id_usuario = :id_usuario,
                    id_endereco = :id_endereco,
                    atualizado_em = NOW()
                WHERE
                    id = :id';

        $evento = new Evento(
            (int) $params['id'],
            $params['titulo'],
            $params['descricao'],
            (float) $params['valor'],
            new DateTime($params['data_inicio']),
            new DateTime($params['data_fim']),
            $params['foto_path'],
            (int) $params['id_tipo'],
            (int) $params['id_status'],
            (int) $params['id_usuario'],
            (int) $params['id_endereco'],
            new DateTime(),
            new DateTime()
        );

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':id', $evento->getId(), PDO::PARAM_INT);
        $stmt->bindValue(':titulo', $evento->getTitulo());
        $stmt->bindValue(':descricao', $evento->getDescricao());
        $stmt->bindValue(':valor', $evento->getValor());
        $stmt->bindValue(':data_inicio', $evento->getDataInicio()->format('Y-m-d H:i:s'));
        $stmt->bindValue(':data_fim', $evento->getDataFim()->format('Y-m-d H:i:s'));
        $stmt->bindValue(':foto_path', $evento->getFotoPath());
        $stmt->bindValue(':id_tipo', $evento->getIdTipo(), PDO::PARAM_INT);
        $stmt->bindValue(':id_status', $evento->getIdStatus(), PDO::PARAM_INT);
        $stmt->bindValue(':id_usuario', $evento->getIdUsuario(), PDO::PARAM_INT);
        $stmt->bindValue(':id_endereco', $evento->getIdEndereco(), PDO::PARAM_INT);

        $stmt->execute();
    }

    public function retornaPorId(int $id): Evento
    {
        $sql = 'SELECT * FROM eventos WHERE id = :id';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id', $id);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_OBJ);

        return new Evento(
            $result->id,
            $result->titulo,
            $result->descricao,
            (float) $result->valor,
            new DateTime($result->data_inicio),
            new DateTime($result->data_fim),
            $result->foto_path,
            (int) $result->id_tipo,
            (int) $result->id_status,
            (int) $result->id_usuario,
            (int) $result->id_endereco,
            new DateTime($result->criado_em),
            $result->atualizado_em ? new DateTime($result->atualizado_em) : null
        );
    }

    public function excluirEvento(int $id): void
    {
        $sql = 'DELETE FROM eventos WHERE id = :id';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
    }
}