import { Routes } from '@angular/router';

export const rutas: Routes = [
  { path: 'acceso', pathMatch: 'full', redirectTo: 'app/inicio' },
  {
    path: 'app',
    loadComponent: () => import('./navegacion/pestanas').then(m => m.Pestanas),
    children: [
      { path: 'inicio', loadComponent: () => import('./funcionalidades/inicio/pagina-inicio').then(m => m.PaginaInicio) },
      { path: 'biblioteca', loadComponent: () => import('./funcionalidades/biblioteca/paginas/pagina-biblioteca').then(m => m.PaginaBiblioteca) },
      { path: 'biblioteca/:id', loadComponent: () => import('./funcionalidades/biblioteca/paginas/pagina-detalle').then(m => m.PaginaDetalle) },
      { path: 'agregar', loadComponent: () => import('./funcionalidades/catalogo/pagina-agregar').then(m => m.PaginaAgregar) },
      { path: 'leer', loadComponent: () => import('./funcionalidades/epub/paginas/pagina-leer').then(m => m.PaginaLeer) },
      { path: 'ajustes', loadComponent: () => import('./funcionalidades/ajustes/pagina-ajustes').then(m => m.PaginaAjustes) },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' }
    ]
  },
  { path: 'lector/:id', loadComponent: () => import('./funcionalidades/epub/paginas/pagina-lector').then(m => m.PaginaLector) },
  { path: '', pathMatch: 'full', redirectTo: 'app/inicio' },
  { path: '**', redirectTo: 'app/inicio' }
];
