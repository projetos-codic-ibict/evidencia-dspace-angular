# EvidencIA

**Repositório Digital de Avaliação de Políticas Públicas.**

Este repositório contém a interface web Angular do EvidencIA, baseada no [dspace-angular](https://github.com/DSpace/dspace-angular). O backend está no repositório [evidencia-dspace](https://github.com/projetos-codic-ibict/evidencia-dspace).

## Instalação recomendada

Para instalar e executar o EvidencIA, incluindo backend, interface e dependências, utilize o instalador Docker do projeto: [ibict-dspace-docker](https://github.com/projetos-codic-ibict/ibict-dspace-docker).

## Execução standalone para desenvolvimento

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run start:dev
```

A aplicação ficará disponível em [http://localhost:4000](http://localhost:4000). Ajuste a configuração de desenvolvimento em `config/` para que a interface se conecte ao backend local do EvidencIA.

## Créditos

O EvidencIA é uma customização do [DSpace](https://github.com/DSpace/DSpace) e do [dspace-angular](https://github.com/DSpace/dspace-angular), projetos originais mantidos pela comunidade DSpace e pela Lyrasis.

A funcionalidade de busca semântica e híbrida do EvidencIA utiliza a implementação do projeto LA Referencia/Lyrasis. A implementação de referência está documentada em:

- [DSpace — Semantic Search Overview](https://github.com/LA-Referencia-Lyrasis-Project/DSpace/blob/vector-search/docs/semantic-search-overview.md)
- [dspace-angular — Semantic Search Overview](https://github.com/LA-Referencia-Lyrasis-Project/dspace-angular/blob/vector-search/docs/semantic-search-overview.md)

## Licença

Este projeto é disponibilizado sob a [licença BSD 3-Clause](LICENSE), a mesma licença do DSpace original. As licenças de dependências de terceiros estão em [LICENSES_THIRD_PARTY](LICENSES_THIRD_PARTY).
