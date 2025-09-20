export const bootstrap = () => {
  console.log('Backend simulation bootstrap placeholder');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}
