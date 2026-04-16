<?php

declare(strict_types=1);

namespace App\Model;

class Evento
{
    private ?int $id;
    private string $titulo;
    private string $descricao;
    private float $valor;
    private \DateTime $dataInicio;
    private \DateTime $dataFim;
    private string $fotoPath;
    private int $idTipo;
    private int $idStatus;
    private int $idUsuario;
    private int $idEndereco;
    private \DateTime $criadoEm;
    private ?\DateTime $atualizadoEm;

    public function __construct(
        ?int $id,
        string $titulo,
        string $descricao,
        float $valor,
        \DateTime $dataInicio,
        \DateTime $dataFim,
        string $fotoPath,
        int $idTipo,
        int $idStatus,
        int $idUsuario,
        int $idEndereco,
        \DateTime $criadoEm,
        ?\DateTime $atualizadoEm = null
    ) {
        $this->id = $id;
        $this->titulo = $titulo;
        $this->descricao = $descricao;
        $this->valor = $valor;
        $this->dataInicio = $dataInicio;
        $this->dataFim = $dataFim;
        $this->fotoPath = $fotoPath;
        $this->idTipo = $idTipo;
        $this->idStatus = $idStatus;
        $this->idUsuario = $idUsuario;
        $this->idEndereco = $idEndereco;
        $this->criadoEm = $criadoEm;
        $this->atualizadoEm = $atualizadoEm;
    }

    // GETTERS

    public function getId(): ?int { return $this->id; }
    public function getTitulo(): string { return $this->titulo; }
    public function getDescricao(): string { return $this->descricao; }
    public function getValor(): float { return $this->valor; }
    public function getDataInicio(): \DateTime { return $this->dataInicio; }
    public function getDataFim(): \DateTime { return $this->dataFim; }
    public function getFotoPath(): string { return $this->fotoPath; }
    public function getIdTipo(): int { return $this->idTipo; }
    public function getIdStatus(): int { return $this->idStatus; }
    public function getIdUsuario(): int { return $this->idUsuario; }
    public function getIdEndereco(): int { return $this->idEndereco; }
    public function getCriadoEm(): \DateTime { return $this->criadoEm; }
    public function getAtualizadoEm(): ?\DateTime { return $this->atualizadoEm; }

    // SETTERS

    public function setTitulo(string $titulo): void { $this->titulo = $titulo; }
    public function setDescricao(string $descricao): void { $this->descricao = $descricao; }
    public function setValor(float $valor): void { $this->valor = $valor; }
    public function setDataInicio(\DateTime $dataInicio): void { $this->dataInicio = $dataInicio; }
    public function setDataFim(\DateTime $dataFim): void { $this->dataFim = $dataFim; }
    public function setFotoPath(string $fotoPath): void { $this->fotoPath = $fotoPath; }
    public function setIdTipo(int $idTipo): void { $this->idTipo = $idTipo; }
    public function setIdStatus(int $idStatus): void { $this->idStatus = $idStatus; }
    public function setIdUsuario(int $idUsuario): void { $this->idUsuario = $idUsuario; }
    public function setIdEndereco(int $idEndereco): void { $this->idEndereco = $idEndereco; }
    public function setAtualizadoEm(?\DateTime $atualizadoEm): void { $this->atualizadoEm = $atualizadoEm; }
}