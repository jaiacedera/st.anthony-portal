import {
  postInstructorLogin,
  postStudentLogin,
} from '../controllers/authController.js'
import {
  getDatabaseStatus,
  postDatabaseInitialization,
} from '../controllers/databaseController.js'
import { getInstructorDashboardData } from '../controllers/instructorDashboardController.js'
import { getStudentDashboardData } from '../controllers/studentDashboardController.js'
import {
  getInstructorSubjectsData,
  postInstructorSubject,
} from '../controllers/instructorSubjectsController.js'
import {
  getInstructorStudentsData,
  postInstructorStudent,
  postInstructorStudentEnrollment,
} from '../controllers/instructorStudentsController.js'
import {
  getHealth,
  getModules,
  getOverview,
} from '../controllers/systemController.js'

const routes = [
  { method: 'GET', pathname: '/', handler: getOverview },
  { method: 'GET', pathname: '/api/health', handler: getHealth },
  { method: 'GET', pathname: '/api/modules', handler: getModules },
  {
    method: 'POST',
    pathname: '/api/auth/instructor/login',
    handler: postInstructorLogin,
  },
  {
    method: 'POST',
    pathname: '/api/auth/student/login',
    handler: postStudentLogin,
  },
  {
    method: 'GET',
    pathname: '/api/instructor/dashboard',
    handler: getInstructorDashboardData,
  },
  {
    method: 'GET',
    pathname: '/api/student/dashboard',
    handler: getStudentDashboardData,
  },
  {
    method: 'GET',
    pathname: '/api/instructor/subjects',
    handler: getInstructorSubjectsData,
  },
  {
    method: 'POST',
    pathname: '/api/instructor/subjects',
    handler: postInstructorSubject,
  },
  {
    method: 'GET',
    pathname: '/api/instructor/students',
    handler: getInstructorStudentsData,
  },
  {
    method: 'POST',
    pathname: '/api/instructor/students',
    handler: postInstructorStudent,
  },
  {
    method: 'POST',
    pathname: '/api/instructor/students/enrollment',
    handler: postInstructorStudentEnrollment,
  },
  {
    method: 'GET',
    pathname: '/api/database/google-sheets/status',
    handler: getDatabaseStatus,
  },
  {
    method: 'POST',
    pathname: '/api/database/google-sheets/init',
    handler: postDatabaseInitialization,
  },
]

export function findRoute(method, pathname) {
  return routes.find(
    (route) => route.method === method && route.pathname === pathname,
  )?.handler
}
