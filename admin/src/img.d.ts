// Imagem importada numa tela vira o endereço do arquivo em /admin/assets (o Vite cuida disso na compilação).
declare module '*.webp' {
  const endereco: string;
  export default endereco;
}
