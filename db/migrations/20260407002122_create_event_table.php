<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateEventTable extends AbstractMigration
{
    /**
     * Change Method.
     *
     * Write your reversible migrations using this method.
     *
     * More information on writing migrations is available here:
     * https://book.cakephp.org/phinx/0/en/migrations.html#the-change-method
     *
     * Remember to call "create()" or "update()" and NOT "save()" when working
     * with the Table class.
     */
    public function change(): void
    {
        $table_tipos = $this->table('tipos');
        $table_tipos->addColumn('nome', 'string')
                    ->create();
        $table_status = $this->table('status');
        $table_status->addColumn('nome', 'string')
                     ->create();
        $table_endereco = $this->table('enderecos');
        $table_endereco->addColumn('logradouro', 'string')
                       ->addColumn('tipo_logradouro', 'string')
                       ->addColumn('complemento', 'string')
                       ->addColumn('numero', 'string')
                       ->addColumn('cidade', 'string')
                       ->addColumn('estado', 'string')
                       ->addColumn('ponto_referencia', 'text')
                       ->create();
        $table = $this->table('eventos');
        $table->addColumn('titulo', 'string')
              ->addColumn('descricao', 'text')
              ->addColumn('valor',  'decimal', ['precision' => 10, 'scale' => 2])
              ->addColumn('data_inicio', 'datetime')
              ->addColumn('data_fim', 'datetime')
              ->addColumn('foto_path', 'string')
              ->addColumn('id_tipo', 'integer', ['signed' => false])
              ->addColumn('id_status', 'integer', ['signed' => false])
              ->addColumn('id_usuario', 'integer', ['signed' => false])
              ->addColumn('id_endereco', 'integer', ['signed' => false])
              ->addColumn('criado_em', 'timestamp', [
                  'default' => 'CURRENT_TIMESTAMP'
                  ])
              ->addColumn('atualizado_em', 'timestamp', [
                  'null' => true
                  ])
              ->create();

        $table->addForeignKey('id_tipo', 'tipos', 'id')
              ->addForeignKey('id_status', 'status', 'id')
              ->addForeignKey('id_usuario', 'usuarios', 'id')
              ->addForeignKey('id_endereco', 'enderecos', 'id')
              ->update();
    }
}
