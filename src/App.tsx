import { Container, Paper, Typography } from '@mui/material';
import ImageConverter from './components/ImageConverter';

function App() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Image tools
        </Typography>
        <ImageConverter />
      </Paper>
    </Container>
  );
}

export default App;