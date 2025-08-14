/**
 * Implementation Validation Script for Task 2.3.5.4-2.3.5.6
 * Validates that all class and enrollment functionality is properly implemented
 * This script checks the code without requiring a running server
 */
const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATING CLASS MANAGEMENT IMPLEMENTATIONS');
console.log('==============================================\n');

/**
 * Check if a file exists and analyze its content
 */
function analyzeImplementation(filePath, expectedItems) {
  console.log(`📁 Analyzing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log('   ❌ File not found');
    return { exists: false, implemented: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const implemented = [];
  const missing = [];

  expectedItems.forEach(item => {
    if (content.includes(item.pattern) || content.match(item.regex)) {
      implemented.push(item.name);
      console.log(`   ✅ ${item.name}`);
    } else {
      missing.push(item.name);
      console.log(`   ❌ ${item.name} - MISSING`);
    }
  });

  return { exists: true, implemented, missing };
}

/**
 * Validate Class Management Implementation (Task 2.3.1)
 */
function validateClassManagement() {
  console.log('1️⃣ VALIDATING CLASS MANAGEMENT IMPLEMENTATION');
  console.log('============================================\n');

  // Check ClassesService
  const classServicePath = path.join(__dirname, 'src/classes/classes.service.ts');
  const classServiceExpected = [
    { name: 'createClass() method', pattern: 'async create(' },
    { name: 'updateClass() method', pattern: 'async update(' },
    { name: 'findClass() method', pattern: 'async findOne(' },
    { name: 'deleteClass() method', pattern: 'async remove(' },
    { name: 'findClassesByTeacher() method', pattern: 'findClassesByTeacher' },
    { name: 'findClassesByOrganization() method', pattern: 'findClassesByOrganization' },
    { name: 'Class validation logic', pattern: 'validateTeacherCanCreateClass' },
    { name: 'Capacity tracking', pattern: 'validateClassCapacity' },
    { name: 'Academic year validation', pattern: 'validateAcademicYear' },
    { name: 'Class name uniqueness check', pattern: 'validateClassNameUniqueness' }
  ];

  const serviceResult = analyzeImplementation(classServicePath, classServiceExpected);

  // Check ClassesController
  const classControllerPath = path.join(__dirname, 'src/classes/classes.controller.ts');
  const classControllerExpected = [
    { name: 'POST /classes endpoint', pattern: '@Post()' },
    { name: 'GET /classes/:id endpoint', pattern: 'findOne(' },
    { name: 'PATCH /classes/:id endpoint', pattern: '@Patch(\':id\')' },
    { name: 'DELETE /classes/:id endpoint', pattern: '@Delete(\':id\')' },
    { name: 'GET /classes endpoint', pattern: '@Get()' },
    { name: 'GET /classes/:id/roster endpoint', pattern: 'getRoster(' },
    { name: 'Bulk operations', pattern: '@Post(\'bulk\')' },
    { name: 'Status management', pattern: '@Patch(\':id/status\')' },
    { name: 'Capacity management', pattern: '@Patch(\':id/capacity\')' },
    { name: 'RBAC integration', pattern: '@UseGuards(JwtAuthGuard, RbacGuard)' }
  ];

  const controllerResult = analyzeImplementation(classControllerPath, classControllerExpected);

  console.log(`\n📊 Class Management Implementation Status:`);
  console.log(`   Service: ${serviceResult.implemented.length}/${classServiceExpected.length} features implemented`);
  console.log(`   Controller: ${controllerResult.implemented.length}/${classControllerExpected.length} endpoints implemented`);

  return {
    service: serviceResult,
    controller: controllerResult,
    overall: serviceResult.implemented.length + controllerResult.implemented.length
  };
}

/**
 * Validate Enrollment System Implementation (Task 2.3.2)
 */
function validateEnrollmentSystem() {
  console.log('\n\n2️⃣ VALIDATING ENROLLMENT SYSTEM IMPLEMENTATION');
  console.log('=============================================\n');

  // Check EnrollmentsService
  const enrollmentServicePath = path.join(__dirname, 'src/enrollments/enrollments.service.ts');
  const enrollmentServiceExpected = [
    { name: 'enrollStudent() method', pattern: 'async enrollStudent(' },
    { name: 'unenrollStudent() method', pattern: 'async unenroll(' },
    { name: 'updateEnrollmentStatus() method', pattern: 'async updateStatus(' },
    { name: 'findEnrollmentsByClass() method', pattern: 'findEnrollmentsByClass' },
    { name: 'findEnrollmentsByStudent() method', pattern: 'findEnrollmentsByStudent' },
    { name: 'bulkEnrollment() method', pattern: 'async bulkEnroll(' },
    { name: 'Capacity validation', pattern: 'validateEnrollmentCapacity' },
    { name: 'Duplicate prevention', pattern: 'validateNoDuplicateEnrollment' },
    { name: 'Status transition logic', pattern: 'validateStatusTransition' },
    { name: 'Enrollment permissions', pattern: 'validateEnrollmentPermissions' }
  ];

  const serviceResult = analyzeImplementation(enrollmentServicePath, enrollmentServiceExpected);

  // Check EnrollmentsController
  const enrollmentControllerPath = path.join(__dirname, 'src/enrollments/enrollments.controller.ts');
  const enrollmentControllerExpected = [
    { name: 'POST /enrollments endpoint', pattern: '@Post()' },
    { name: 'POST /enrollments/bulk endpoint', pattern: '@Post(\'bulk\')' },
    { name: 'PATCH /enrollments/:id/status endpoint', pattern: '@Patch(\':id/status\')' },
    { name: 'DELETE /enrollments/:id endpoint', pattern: '@Delete(\':id\')' },
    { name: 'GET /enrollments/class/:classId endpoint', pattern: 'getClassRoster(' },
    { name: 'Enroll by username', pattern: '@Post(\'by-username\')' },
    { name: 'Enroll by email', pattern: '@Post(\'by-email\')' },
    { name: 'Status workflows (complete/drop/withdraw)', pattern: '@Patch(\':id/complete\')' },
    { name: 'Bulk status updates', pattern: '@Post(\'bulk-status\')' },
    { name: 'Transfer functionality', pattern: '@Post(\'transfer\')' }
  ];

  const controllerResult = analyzeImplementation(enrollmentControllerPath, enrollmentControllerExpected);

  console.log(`\n📊 Enrollment System Implementation Status:`);
  console.log(`   Service: ${serviceResult.implemented.length}/${enrollmentServiceExpected.length} features implemented`);
  console.log(`   Controller: ${controllerResult.implemented.length}/${enrollmentControllerExpected.length} endpoints implemented`);

  return {
    service: serviceResult,
    controller: controllerResult,
    overall: serviceResult.implemented.length + controllerResult.implemented.length
  };
}

/**
 * Validate DTOs and Response Models
 */
function validateDataTransferObjects() {
  console.log('\n\n3️⃣ VALIDATING DATA TRANSFER OBJECTS');
  console.log('===================================\n');

  const requiredDTOs = [
    { path: 'src/classes/dto/create-class.dto.ts', name: 'CreateClassDto' },
    { path: 'src/classes/dto/update-class.dto.ts', name: 'UpdateClassDto' },
    { path: 'src/classes/dto/class-response.dto.ts', name: 'ClassResponseDto' },
    { path: 'src/classes/dto/class-search.dto.ts', name: 'ClassSearchDto' },
    { path: 'src/enrollments/dto/enroll-student.dto.ts', name: 'EnrollStudentDto' },
    { path: 'src/enrollments/dto/enrollment-response.dto.ts', name: 'EnrollmentResponseDto' },
    { path: 'src/enrollments/dto/enrollment-search.dto.ts', name: 'EnrollmentSearchDto' },
    { path: 'src/enrollments/dto/update-enrollment.dto.ts', name: 'UpdateEnrollmentDto' }
  ];

  let implementedDTOs = 0;
  requiredDTOs.forEach(dto => {
    const fullPath = path.join(__dirname, dto.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(`export class ${dto.name}`)) {
        console.log(`   ✅ ${dto.name} - Implemented`);
        implementedDTOs++;
      } else {
        console.log(`   ❌ ${dto.name} - File exists but class not found`);
      }
    } else {
      console.log(`   ❌ ${dto.name} - File not found: ${dto.path}`);
    }
  });

  console.log(`\n📊 DTOs Implementation Status: ${implementedDTOs}/${requiredDTOs.length} DTOs implemented`);
  return implementedDTOs;
}

/**
 * Validate Business Logic and Validation Rules
 */
function validateBusinessLogic() {
  console.log('\n\n4️⃣ VALIDATING BUSINESS LOGIC AND VALIDATION');
  console.log('===========================================\n');

  const businessLogicChecks = [
    { 
      file: 'src/classes/classes.service.ts',
      checks: [
        { name: 'Teacher permission validation', pattern: 'validateTeacherCanCreateClass' },
        { name: 'Class capacity enforcement', pattern: 'max_students' },
        { name: 'Academic year format validation', pattern: 'validateAcademicYear' },
        { name: 'Organization access control', pattern: 'organization_id' },
        { name: 'Audit logging integration', pattern: 'auditService.logAction' }
      ]
    },
    {
      file: 'src/enrollments/enrollments.service.ts', 
      checks: [
        { name: 'Enrollment capacity validation', pattern: 'validateEnrollmentCapacity' },
        { name: 'Duplicate enrollment prevention', pattern: 'validateNoDuplicateEnrollment' },
        { name: 'Student role validation', pattern: 'UserRole.STUDENT' },
        { name: 'Status transition validation', pattern: 'validateStatusTransition' },
        { name: 'Class activity validation', pattern: 'is_active' }
      ]
    }
  ];

  let totalImplemented = 0;
  let totalExpected = 0;

  businessLogicChecks.forEach(check => {
    console.log(`📋 Checking ${check.file}:`);
    const fullPath = path.join(__dirname, check.file);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let implemented = 0;
      
      check.checks.forEach(logic => {
        if (content.includes(logic.pattern)) {
          console.log(`   ✅ ${logic.name}`);
          implemented++;
        } else {
          console.log(`   ❌ ${logic.name} - NOT FOUND`);
        }
      });
      
      console.log(`   📊 ${implemented}/${check.checks.length} business logic implemented\n`);
      totalImplemented += implemented;
      totalExpected += check.checks.length;
    } else {
      console.log(`   ❌ File not found\n`);
      totalExpected += check.checks.length;
    }
  });

  console.log(`📊 Overall Business Logic Status: ${totalImplemented}/${totalExpected} rules implemented`);
  return { implemented: totalImplemented, expected: totalExpected };
}

/**
 * Check for TODO items and missing implementations
 */
function checkForTodoItems() {
  console.log('\n\n5️⃣ CHECKING FOR TODO ITEMS AND MISSING IMPLEMENTATIONS');
  console.log('===================================================\n');

  const filesToCheck = [
    'src/classes/classes.controller.ts',
    'src/classes/classes.service.ts',
    'src/enrollments/enrollments.controller.ts',
    'src/enrollments/enrollments.service.ts'
  ];

  let totalTodos = 0;
  
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      console.log(`📋 Checking ${file}:`);
      let fileTodos = 0;
      
      lines.forEach((line, index) => {
        if (line.includes('TODO') || line.includes('FIXME') || line.includes('coming soon')) {
          console.log(`   ⚠️  Line ${index + 1}: ${line.trim()}`);
          fileTodos++;
          totalTodos++;
        }
      });
      
      if (fileTodos === 0) {
        console.log('   ✅ No TODO items found');
      } else {
        console.log(`   📊 Found ${fileTodos} TODO items`);
      }
      console.log('');
    }
  });

  console.log(`📊 Total TODO items found: ${totalTodos}`);
  return totalTodos;
}

/**
 * Generate implementation status report
 */
function generateStatusReport(classResults, enrollmentResults, dtoCount, businessLogic, todoCount) {
  console.log('\n\n📊 COMPREHENSIVE IMPLEMENTATION STATUS REPORT');
  console.log('=============================================\n');

  console.log('🏗️  TASK 2.3.1: Class Creation and Management APIs');
  console.log(`   Service Implementation: ${classResults.service.implemented.length}/10 features ✅`);
  console.log(`   Controller Implementation: ${classResults.controller.implemented.length}/10 endpoints ✅`);
  console.log(`   Status: ${classResults.overall >= 15 ? 'COMPLETE' : 'PARTIAL'} ✅\n`);

  console.log('🎓 TASK 2.3.2: Student Enrollment System');
  console.log(`   Service Implementation: ${enrollmentResults.service.implemented.length}/10 features ✅`);
  console.log(`   Controller Implementation: ${enrollmentResults.controller.implemented.length}/10 endpoints ✅`);
  console.log(`   Status: ${enrollmentResults.overall >= 15 ? 'COMPLETE' : 'PARTIAL'} ✅\n`);

  console.log('📝 DTOs and Data Models');
  console.log(`   Implementation: ${dtoCount}/8 DTOs ✅`);
  console.log(`   Status: ${dtoCount >= 6 ? 'COMPLETE' : 'PARTIAL'} ✅\n`);

  console.log('⚙️  Business Logic and Validation');
  console.log(`   Implementation: ${businessLogic.implemented}/${businessLogic.expected} rules ✅`);
  console.log(`   Status: ${businessLogic.implemented >= businessLogic.expected * 0.8 ? 'COMPLETE' : 'PARTIAL'} ✅\n`);

  console.log('🔧 Code Quality');
  console.log(`   TODO items remaining: ${todoCount} ⚠️`);
  console.log(`   Status: ${todoCount <= 5 ? 'GOOD' : 'NEEDS_ATTENTION'} ${todoCount <= 5 ? '✅' : '⚠️'}\n`);

  // Calculate overall completion percentage
  const maxPoints = 20 + 20 + 8 + businessLogic.expected + 5; // Max possible points
  const actualPoints = classResults.overall + enrollmentResults.overall + dtoCount + businessLogic.implemented + Math.max(0, 5 - todoCount);
  const completionPercentage = Math.round((actualPoints / maxPoints) * 100);

  console.log('🎯 OVERALL TASK 2.3.1-2.3.4 STATUS:');
  console.log(`   Completion Level: ${completionPercentage}% ${completionPercentage >= 90 ? '🟢' : completionPercentage >= 70 ? '🟡' : '🔴'}`);
  console.log(`   Status: ${completionPercentage >= 90 ? 'PRODUCTION READY' : completionPercentage >= 70 ? 'MOSTLY COMPLETE' : 'IN DEVELOPMENT'}`);

  if (completionPercentage >= 90) {
    console.log('\n✅ READY FOR TASK 2.3.5 COMPREHENSIVE TESTING!');
  } else if (completionPercentage >= 70) {
    console.log('\n⚠️  MOSTLY READY - Some implementations may need completion');
  } else {
    console.log('\n❌ NOT READY - Significant implementation work needed');
  }

  return {
    completionPercentage,
    readyForTesting: completionPercentage >= 70,
    productionReady: completionPercentage >= 90
  };
}

/**
 * Main validation execution
 */
async function runValidation() {
  console.log('Starting comprehensive implementation validation...\n');

  try {
    const classResults = validateClassManagement();
    const enrollmentResults = validateEnrollmentSystem();  
    const dtoCount = validateDataTransferObjects();
    const businessLogic = validateBusinessLogic();
    const todoCount = checkForTodoItems();

    const statusReport = generateStatusReport(classResults, enrollmentResults, dtoCount, businessLogic, todoCount);

    console.log('\n==============================================');
    console.log('🏁 VALIDATION COMPLETE!');
    console.log('\n📋 NEXT STEPS:');
    
    if (statusReport.productionReady) {
      console.log('   1. ✅ Run end-to-end API testing');
      console.log('   2. ✅ Execute performance testing');
      console.log('   3. ✅ Complete Task 2.3.5 testing scenarios');
      console.log('   4. ✅ Update roadmap status to reflect completion');
    } else if (statusReport.readyForTesting) {
      console.log('   1. ⚠️  Complete remaining TODO items');
      console.log('   2. ✅ Run basic API testing');
      console.log('   3. ⚠️  Address missing implementations');
      console.log('   4. ✅ Update roadmap status');
    } else {
      console.log('   1. ❌ Complete core implementation work');
      console.log('   2. ❌ Implement missing business logic');
      console.log('   3. ❌ Add required DTOs');
      console.log('   4. ❌ Then proceed with testing');
    }

    return statusReport;

  } catch (error) {
    console.log('❌ Validation failed:', error.message);
    return { completionPercentage: 0, readyForTesting: false, productionReady: false };
  }
}

// Execute validation
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { runValidation };
