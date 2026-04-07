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
        $table = $this->table('eventos');
        $table->addColumn('titulo', 'string')
              ->addColumn('descricao', 'string')
              ->addColumn('tipo', 'string')
              ->addColumn('valor', 'float')
              ->addColumn('data_inicio', 'date')
              ->addColumn('data_fim', 'date')
              ->addColumn('', 'string')
              ->addColumn('foto_path', 'string')
              ->addColumn('created_at', 'timestamp', [
                  'default' => 'CURRENT_TIMESTAMP'
                  ])
              ->addColumn('id_endereco', 'integer')
              ->create();
    }
}
