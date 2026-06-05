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
    public function listarEventos(): array
    {
        $sql = 'SELECT 
                    e.id,
                    e.titulo,
                    cat.nome as categoria,
                    data_inicio,
                    data_fim,
                    ender.nome_local,
                    ender.cidade,
                    ender.estado,
                    e.valor,
                    e.descricao,
                    e.foto_path,
                    e.destaque
                FROM
                    eventos as e
                LEFT OUTER JOIN 
                    categorias as cat on cat.id = e.id_categoria
                LEFT OUTER JOIN
                    enderecos as ender on ender.id = e.id_endereco;';
        
        $stmt = $this->con->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_OBJ);
    }
    public function retornaDetalhesEvento(int $id): ?array
    {
        $sql = 'SELECT
                    e.id,
                    e.titulo,
                    e.descricao,
                    e.valor,
                    e.data_inicio,
                    e.data_fim,
                    e.foto_path,
                    e.destaque,
                    cat.nome AS categoria,
                    ender.nome_local,
                    ender.cidade,
                    ender.estado
                FROM eventos AS e
                LEFT JOIN categorias AS cat ON cat.id = e.id_categoria
                LEFT JOIN enderecos AS ender ON ender.id = e.id_endereco
                WHERE e.id = :id;';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_OBJ);
        if (!$result) {
            return null;
        }

        return [
            'id' => $result->id,
            'titulo' => $result->titulo,
            'descricao' => $result->descricao,
            'valor' => $result->valor,
            'data_inicio' => $result->data_inicio,
            'data_fim' => $result->data_fim,
            'foto_path' => $result->foto_path,
            'categoria' => $result->categoria,
            'nome_local' => $result->nome_local,
            'cidade' => $result->cidade,
            'estado' => $result->estado,
            'destaque' => $result->destaque,
        ];
    }
    public function retornaQtdAtivos() : string
    {
        $sql = 'SELECT COUNT(*) AS total_eventos FROM eventos WHERE id_status = 1;';

        $stmt = $this->con->prepare($sql);
        $stmt->execute();

        $resultado = $stmt->fetch();

        return $resultado->total_eventos;
    }
    public function listarCategorias(): array
    {
        $sql = 'SELECT 
                    id,
                    nome,
                    icone
                FROM
                    categorias;';
        
        $stmt = $this->con->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_OBJ);
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
    public function realizarReserva(array $params): void
    {
        $sql = 'INSERT INTO 
                    reservas (
                        id_usuario,
                        id_evento,
                        data_reserva
                    ) 
                VALUES 
                    (
                        :id_usuario,
                        :id_evento,
                        :data_reserva
                    )';

        $stmt = $this->con->prepare($sql);

        $stmt->bindValue(':id_usuario', $params['id_usuario'], PDO::PARAM_INT);
        $stmt->bindValue(':id_evento', $params['id_evento'], PDO::PARAM_INT);
        $stmt->bindValue(':data_reserva', $params['data_reserva']);

        $stmt->execute();
    }
    public function verificaExistenciaInscricao(int $idAtividade, int $idUsuario): bool
    {
        $sql = '
            SELECT 1
            FROM inscricoes
            WHERE id_atividade = :id_atividade
            AND id_usuario = :id_usuario
            LIMIT 1
        ';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_atividade', $idAtividade);
        $stmt->bindValue(':id_usuario', $idUsuario);
        $stmt->execute();

        return (bool) $stmt->fetch();       
    }
    public function realizarInscricao(array $params): void
    {
        $usuarioService = new UsuarioService();
        if ($params['audience'] === 'escola') {
            //verificar se o responsavel ja esta cadastrado no banco, e retornar o id caso sim
            $idResponsavel = null;
            $resposavel = $usuarioService->retornaPorCPF($params['responsible_cpf'] ?? '') ?: null;
            if ($resposavel) {
                $idResponsavel = $resposavel->id;
                error_log(print_r('ja existe responsavel ' . $idResponsavel, true));
            } else {
                //cadastrar o responsavel e retornar o id
                $idResponsavel = $usuarioService->cadastrarUsuario([
                    'nome' => $params['responsible_name'] ?? '',
                    'sobrenome' => '',
                    'email' => $params['email'] ?? '',
                    'telefone' => $params['phone'] ?? '',
                    'cpf' => $params['responsible_cpf'] ?? '',
                    'data_nascimento' => null,
                    'cargo' => 'responsavel',
                    'foto_path' => '',
                ]);
                error_log(print_r('novo responsavel ' . $idResponsavel, true));
            }
            //vincular o aluno ao responsavel

            //Verifica se ja existe vinculo
            $usuarios = $usuarioService->retornaPorNome($params['name']);
            $vinculo = null;
            if ($usuarios) {
                for ($i=0; $i < count($usuarios); $i++) { 
                    $usuario = $usuarios[$i];
                    $vinculo = $usuarioService->verificaVinculoResponsavel($idResponsavel, $usuario->id);
                    if ($vinculo) {
                        break;
                    }
                }
            }
            //Caso ache, pega o id
            if ($vinculo) {
                $idAluno = $vinculo->id_dependente;
            } else {
                //Caso nao ache, cadastra o aluno e vincula ao responsavel
                $idAluno = $usuarioService->cadastrarUsuario([
                    'nome' => $params['name'] ?? '',
                    'sobrenome' => '',
                    'email' => $params['email'] ?? '',
                    'telefone' => $params['phone'] ?? '',
                    'cpf' => null,
                    'data_nascimento' => null,
                    'cargo' => 'aluno',
                    'foto_path' => '',
                ]);
                error_log('vinculando aluno ao responsavel' . print_r('aluno ' . $idAluno . ' responsavel ' . $idResponsavel . ' parentesco ' . $params['relationship'] ?? '', true));
                $usuarioService->vincularAlunoResponsavel($idAluno, $idResponsavel, $params['relationship'] ?? '');
            }
            //Vincular o aluno à uma turma
            error_log('vinculando aluno à uma turma ' . print_r('aluno ' . $idAluno . ' turma ' . $params['student_class'] ?? '', true));
            $usuarioService->vincularAlunoTurma($idAluno, $params['student_class']);

            //realizar a inscricao
            
            if ($this->verificaExistenciaInscricao($params['event_id'], $idAluno)) {
                error_log('aluno já inscrito ' . print_r('aluno ' . $idAluno . ' evento ' . $params['event_id'], true));
                throw new \Exception('Este aluno já está inscrito neste evento.');
            }

            error_log('realizando inscrição ' . print_r('aluno ' . $idAluno . ' evento ' . $params['event_id'], true));
            try {
                $sql = 'INSERT INTO 
                            inscricoes (
                                id_atividade,
                                id_usuario,
                                id_responsavel
                            ) 
                        VALUES 
                            (
                                :id_atividade,
                                :id_usuario,
                                :id_responsavel
                            )';
                
                $stmt = $this->con->prepare($sql);
                $stmt->bindValue(':id_atividade', $params['event_id'], PDO::PARAM_INT); //Charque, vai ser ajustado na versao final
                $stmt->bindValue(':id_usuario', $idAluno, PDO::PARAM_INT);              //a pessoa poderá se inscrever em apenas uma atividade
                $stmt->bindValue(':id_responsavel', $idResponsavel, PDO::PARAM_INT);    //ex: semana academica
                                                                                        //Por enquanto vai usar esse id ja q tem apenas 1 mesmo
                $stmt->execute();
                error_log('inscrição realizada com sucesso ' . print_r('aluno ' . $idAluno . ' evento ' . $params['event_id'], true));
            } catch (\Throwable $th) {
                error_log('erro ao realizar inscrição ' . print_r('aluno ' . $idAluno . ' evento ' . $params['event_id'] . ' erro ' . $th->getMessage(), true));
                throw $th;
            }    
        } else if ($params['audience'] === 'graduacao') {
            # todo
        }
    }
    public function listarInscricoes(int $idEvento) : array|null
    {
        $sql = 'SELECT
                    i.id_atividade as eventId,
                    atv.nome as eventTitle,
                    atv.data_ini as date_begin,
                    resp.nome as responsibleName,
                    resp.cpf as responsiblecpf,
                    vinc.parentesco as relationship,
                    dep.nome as studentName,
                    t.nome as studentClass,
                    c.nome as course,
                    i.inscrito_em as createdAt
                FROM
                    inscricoes as i
                LEFT OUTER JOIN 
                    atividades as atv on atv.id = i.id_atividade
                LEFT OUTER JOIN
                    usuarios as dep on dep.id = i.id_usuario
                LEFT OUTER JOIN
                    usuarios as resp on resp.id = i.id_responsavel
                LEFT OUTER JOIN
                    usuarios_responsaveis as vinc on vinc.id_responsavel = resp.id and vinc.id_dependente = dep.id
                LEFT OUTER JOIN
                    usuarios_turmas as ut on ut.id_usuario = dep.id
                LEFT OUTER JOIN
                    turmas as t on t.id = ut.id_turma
                LEFT OUTER JOIN
                    cursos as c on c.id = t.id_curso
                WHERE
                    i.id_atividade = :id_atividade;';

        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_atividade', $idEvento, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetchAll(PDO::FETCH_OBJ);

        return $result ?: null;
    }
    public function retornaQtdInscricoes(int $idEvento)
    {
        $sql = 'SELECT COUNT(*) AS count FROM inscricoes WHERE id_atividade = :id_atividade';
        $stmt = $this->con->prepare($sql);
        $stmt->bindValue(':id_atividade', $idEvento, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'];
    }
}
