import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'HomeView',
    component: HomeView
  }
]

const result = import.meta.env.VITE_APP_IS_LOCAL
if(result === 'true') {
  routes.push({
    path: '/test',
    name: 'TestView',
    component: () => import('../views/TestView.vue')
  })

}


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
