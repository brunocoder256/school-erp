import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  AdmissionType,
  AssessmentScoreStatus,
  AssessmentStatus,
  AssessmentType,
  EnrollmentStatus,
  Gender,
  RankingMethod,
  RankingScope,
  RankingTieHandling,
  ResultStatus,
  StudentStatus,
} from "../generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  { key: "schools.read", description: "View schools" },
  { key: "schools.create", description: "Create schools" },
  { key: "schools.update", description: "Update schools" },
  { key: "schools.delete", description: "Delete schools" },

  { key: "users.read", description: "View users" },
  { key: "users.create", description: "Create users" },
  { key: "users.update", description: "Update users" },
  { key: "users.delete", description: "Deactivate or delete users" },

  { key: "memberships.read", description: "View school memberships" },
  { key: "memberships.create", description: "Add users to schools" },
  { key: "memberships.update", description: "Update school memberships" },
  { key: "memberships.delete", description: "Remove users from schools" },

  { key: "roles.read", description: "View roles" },
  { key: "roles.assign", description: "Assign roles to users" },
  { key: "roles.revoke", description: "Revoke roles from users" },

  { key: "academic_years.read", description: "View academic years" },
  { key: "academic_years.create", description: "Create academic years" },
  { key: "academic_years.update", description: "Update academic years" },
  { key: "academic_years.delete", description: "Delete academic years" },

  { key: "terms.read", description: "View academic terms" },
  { key: "terms.create", description: "Create academic terms" },
  { key: "terms.update", description: "Update academic terms" },
  { key: "terms.delete", description: "Delete academic terms" },

  { key: "students.read", description: "View students" },
  { key: "students.create", description: "Create students" },
  { key: "students.update", description: "Update students" },
  { key: "students.delete", description: "Delete or deactivate students" },

  { key: "staff.read", description: "View staff" },
  { key: "staff.create", description: "Create staff records" },
  { key: "staff.update", description: "Update staff records" },
  { key: "staff.delete", description: "Delete or deactivate staff records" },

  { key: "attendance.read", description: "View attendance" },
  { key: "attendance.mark", description: "Mark attendance" },
  { key: "attendance.update", description: "Update attendance" },

  { key: "grades.read", description: "View grades" },
  { key: "grades.enter", description: "Enter grades" },
  { key: "grades.update", description: "Update grades" },
  { key: "grades.approve", description: "Approve grades" },

  { key: "academic_structure.read", description: "View academic structure configuration" },
  { key: "academic_structure.create", description: "Create academic structure configuration" },
  { key: "academic_structure.update", description: "Update academic structure configuration" },
  { key: "academic_structure.delete", description: "Delete academic structure configuration" },

  { key: "subjects.read", description: "View subjects and subject categories" },
  { key: "subjects.create", description: "Create subjects and subject categories" },
  { key: "subjects.update", description: "Update subjects and subject categories" },
  { key: "subjects.delete", description: "Delete subjects and subject categories" },

  { key: "subject_offerings.read", description: "View subject offerings" },
  { key: "subject_offerings.create", description: "Create subject offerings" },
  { key: "subject_offerings.update", description: "Update subject offerings" },
  { key: "subject_offerings.delete", description: "Delete subject offerings" },

  { key: "combinations.read", description: "View subject combinations" },
  { key: "combinations.create", description: "Create subject combinations" },
  { key: "combinations.update", description: "Update subject combinations" },
  { key: "combinations.delete", description: "Delete subject combinations" },

  { key: "teacher_assignments.read", description: "View teaching assignments" },
  { key: "teacher_assignments.create", description: "Create teaching assignments" },
  { key: "teacher_assignments.update", description: "Update teaching assignments" },
  { key: "teacher_assignments.delete", description: "Deactivate or remove teaching assignments" },

  { key: "subject_allocations.read", description: "View subject allocations" },
  { key: "subject_allocations.create", description: "Create subject allocations" },
  { key: "subject_allocations.update", description: "Update or deactivate subject allocations" },

  { key: "teaching_groups.read", description: "View teaching groups" },
  { key: "teaching_groups.create", description: "Create teaching groups" },
  { key: "teaching_groups.update", description: "Update or deactivate teaching groups" },

  { key: "student_subjects.read", description: "View student subject enrollments" },
  { key: "student_subjects.create", description: "Enroll students in subjects" },
  { key: "student_subjects.update", description: "Update or deactivate student subject enrollments" },

  { key: "assessment_schemes.read", description: "View assessment schemes" },
  { key: "assessment_schemes.create", description: "Create assessment schemes" },
  { key: "assessment_schemes.update", description: "Update or archive assessment schemes" },

  { key: "grading_schemes.read", description: "View grading schemes" },
  { key: "grading_schemes.create", description: "Create grading schemes" },
  { key: "grading_schemes.update", description: "Update or archive grading schemes" },

  { key: "ranking_policies.read", description: "View ranking policies" },
  { key: "ranking_policies.create", description: "Create ranking policies" },
  { key: "ranking_policies.update", description: "Update or deactivate ranking policies" },

  { key: "assessments.read", description: "View assessments" },
  { key: "assessments.create", description: "Create assessments" },
  { key: "assessments.update", description: "Update assessments" },

  { key: "assessment_scores.read", description: "View assessment component scores" },
  { key: "assessment_scores.create", description: "Record assessment component scores" },
  { key: "assessment_scores.update", description: "Update assessment component scores" },

  { key: "examinations.read", description: "View examinations" },
  { key: "examinations.create", description: "Create examinations" },
  { key: "examinations.update", description: "Update examinations" },

  { key: "results.read", description: "View learner results" },
  { key: "results.create", description: "Generate learner results" },
  { key: "results.update", description: "Submit learner results" },
  { key: "results.approve", description: "Approve learner results" },
  { key: "results.lock", description: "Lock learner results" },
  { key: "results.amend", description: "Amend finalized learner results" },

  { key: "rankings.read", description: "View learner rankings" },

  { key: "analytics.read", description: "View analytics and performance summaries" },
];

const roles = [
  {
    name: "SUPER_ADMIN",
    scope: "SYSTEM" as const,
    description: "Platform administrator with system-wide access",
  },
  {
    name: "SCHOOL_ADMIN",
    scope: "SCHOOL" as const,
    description: "Administrator for a specific school",
  },
  {
    name: "TEACHER",
    scope: "SCHOOL" as const,
    description: "Teacher within a specific school",
  },
  {
    name: "STUDENT",
    scope: "SCHOOL" as const,
    description: "Student within a specific school",
  },
  {
    name: "PARENT",
    scope: "SCHOOL" as const,
    description: "Parent or guardian within a specific school",
  },
  {
    name: "STAFF",
    scope: "SCHOOL" as const,
    description: "Non-teaching staff within a specific school",
  },
];

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions.map((permission) => permission.key),

  SCHOOL_ADMIN: [
    "schools.read",
    "schools.update",
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "memberships.read",
    "memberships.create",
    "memberships.update",
    "memberships.delete",
    "roles.read",
    "roles.assign",
    "roles.revoke",
    "academic_years.read",
    "academic_years.create",
    "academic_years.update",
    "academic_years.delete",
    "terms.read",
    "terms.create",
    "terms.update",
    "terms.delete",
    "students.read",
    "students.create",
    "students.update",
    "students.delete",
    "staff.read",
    "staff.create",
    "staff.update",
    "staff.delete",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "grades.read",
    "grades.enter",
    "grades.update",
    "grades.approve",
    "academic_structure.read",
    "academic_structure.create",
    "academic_structure.update",
    "academic_structure.delete",
    "subjects.read",
    "subjects.create",
    "subjects.update",
    "subjects.delete",
    "subject_offerings.read",
    "subject_offerings.create",
    "subject_offerings.update",
    "subject_offerings.delete",
    "combinations.read",
    "combinations.create",
    "combinations.update",
    "combinations.delete",
    "teacher_assignments.read",
    "teacher_assignments.create",
    "teacher_assignments.update",
    "teacher_assignments.delete",
    "subject_allocations.read",
    "subject_allocations.create",
    "subject_allocations.update",
    "teaching_groups.read",
    "teaching_groups.create",
    "teaching_groups.update",
    "student_subjects.read",
    "student_subjects.create",
    "student_subjects.update",
    "assessment_schemes.read",
    "assessment_schemes.create",
    "assessment_schemes.update",
    "grading_schemes.read",
    "grading_schemes.create",
    "grading_schemes.update",
    "ranking_policies.read",
    "ranking_policies.create",
    "ranking_policies.update",
    "assessments.read",
    "assessments.create",
    "assessments.update",
    "assessment_scores.read",
    "assessment_scores.create",
    "assessment_scores.update",
    "examinations.read",
    "examinations.create",
    "examinations.update",
    "results.read",
    "results.create",
    "results.update",
    "results.approve",
    "results.lock",
    "results.amend",
    "rankings.read",
     "analytics.read",
  ],

  TEACHER: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "staff.read",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "grades.read",
    "grades.enter",
    "grades.update",
    "academic_structure.read",
    "subjects.read",
    "subject_offerings.read",
    "combinations.read",
    "teacher_assignments.read",
    "subject_allocations.read",
    "teaching_groups.read",
    "student_subjects.read",
    "assessment_schemes.read",
    "grading_schemes.read",
    "ranking_policies.read",
    "assessments.read",
    "assessments.create",
    "assessments.update",
    "assessment_scores.read",
    "assessment_scores.create",
    "assessment_scores.update",
    "examinations.read",
    "results.read",
    "results.create",
    "results.update",
    "rankings.read",
    "analytics.read",
  ],

  STUDENT: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "attendance.read",
    "grades.read",
    "academic_structure.read",
    "subjects.read",
    "subject_offerings.read",
    "combinations.read",
    "subject_allocations.read",
    "teaching_groups.read",
    "student_subjects.read",
    "assessment_schemes.read",
    "grading_schemes.read",
    "ranking_policies.read",
    "assessments.read",
    "assessment_scores.read",
    "examinations.read",
    "results.read",
    "rankings.read",
    "analytics.read",
  ],

  PARENT: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "attendance.read",
    "grades.read",
    "academic_structure.read",
    "subjects.read",
    "subject_offerings.read",
    "combinations.read",
    "subject_allocations.read",
    "teaching_groups.read",
    "student_subjects.read",
    "assessment_schemes.read",
    "grading_schemes.read",
    "ranking_policies.read",
    "assessments.read",
    "assessment_scores.read",
    "examinations.read",
    "results.read",
    "rankings.read",
    "analytics.read",
  ],

  STAFF: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "staff.read",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "academic_structure.read",
    "subjects.read",
    "subject_offerings.read",
    "combinations.read",
    "subject_allocations.read",
    "teaching_groups.read",
    "student_subjects.read",
    "assessment_schemes.read",
    "grading_schemes.read",
    "ranking_policies.read",
    "assessments.read",
    "assessment_scores.read",
    "examinations.read",
    "results.read",
    "rankings.read",
    "analytics.read",
  ],
};

async function main() {
  console.log("Seeding permissions...");

  const permissionMap = new Map<string, string>();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        description: permission.description,
      },
      create: permission,
    });

    permissionMap.set(record.key, record.id);
  }

  console.log(`Seeded ${permissionMap.size} permissions.`);

  console.log("Seeding roles...");

  const roleMap = new Map<string, string>();

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        scope: role.scope,
        description: role.description,
      },
      create: role,
    });

    roleMap.set(record.name, record.id);
  }

  console.log(`Seeded ${roleMap.size} roles.`);

  console.log("Seeding role permissions...");

  let assignments = 0;

  for (const [roleName, permissionKeys] of Object.entries(rolePermissions)) {
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      throw new Error(`Role "${roleName}" was not found.`);
    }

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionMap.get(permissionKey);

      if (!permissionId) {
        throw new Error(
          `Permission "${permissionKey}" required by "${roleName}" was not found.`,
        );
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });

      assignments++;
    }
  }

  console.log(`Created/verified ${assignments} role-permission assignments.`);

  console.log("Seeding demonstration school academic structure...");

  const school = await prisma.school.upsert({
    where: { code: "MUK-H" },
    update: {
      name: "Mukono High School",
      description:
        "Demonstration school seeded with a representative configurable Uganda academic structure.",
    },
    create: {
      name: "Mukono High School",
      code: "MUK-H",
      description:
        "Demonstration school seeded with a representative configurable Uganda academic structure.",
    },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2026" } },
    update: { isActive: true },
    create: {
      schoolId: school.id,
      name: "2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
  });

  const organizations: Record<string, { id: string }> = {};
  const organizationSeeds = [
    { code: "THEMATIC", name: "Thematic" },
    { code: "SUBJECT_BASED", name: "Subject-based" },
    { code: "COMPETENCY_BASED", name: "Competency-based" },
    { code: "MIXED", name: "Mixed" },
    { code: "CUSTOM", name: "Custom" },
  ];

  for (const organization of organizationSeeds) {
    const record = await prisma.academicOrganization.upsert({
      where: { schoolId_code: { schoolId: school.id, code: organization.code } },
      update: { name: organization.name },
      create: {
        schoolId: school.id,
        code: organization.code,
        name: organization.name,
      },
    });
    organizations[organization.code] = record;
  }

  const sections: Record<string, { id: string }> = {};
  const sectionSeeds = [
    { code: "NURSERY", name: "Nursery", displayOrder: 1 },
    { code: "PRIMARY", name: "Primary", displayOrder: 2 },
    { code: "LOWER_SECONDARY", name: "Lower Secondary", displayOrder: 3 },
    { code: "UPPER_SECONDARY", name: "Upper Secondary", displayOrder: 4 },
  ];

  for (const section of sectionSeeds) {
    const record = await prisma.educationSection.upsert({
      where: { schoolId_code: { schoolId: school.id, code: section.code } },
      update: { name: section.name, displayOrder: section.displayOrder },
      create: {
        schoolId: school.id,
        code: section.code,
        name: section.name,
        displayOrder: section.displayOrder,
      },
    });
    sections[section.code] = record;
  }

  const levels: Record<string, { id: string; name: string }> = {};
  const levelSeeds = [
    { code: "N1", name: "Nursery 1", levelNumber: 1, section: "NURSERY", org: "THEMATIC", displayOrder: 1 },
    { code: "N2", name: "Nursery 2", levelNumber: 2, section: "NURSERY", org: "THEMATIC", displayOrder: 2 },
    { code: "N3", name: "Nursery 3", levelNumber: 3, section: "NURSERY", org: "THEMATIC", displayOrder: 3 },
    { code: "P1", name: "Primary 1", levelNumber: 1, section: "PRIMARY", org: "THEMATIC", displayOrder: 4 },
    { code: "P2", name: "Primary 2", levelNumber: 2, section: "PRIMARY", org: "THEMATIC", displayOrder: 5 },
    { code: "P3", name: "Primary 3", levelNumber: 3, section: "PRIMARY", org: "THEMATIC", displayOrder: 6 },
    { code: "P4", name: "Primary 4", levelNumber: 4, section: "PRIMARY", org: "MIXED", displayOrder: 7 },
    { code: "P5", name: "Primary 5", levelNumber: 5, section: "PRIMARY", org: "SUBJECT_BASED", displayOrder: 8 },
    { code: "P6", name: "Primary 6", levelNumber: 6, section: "PRIMARY", org: "SUBJECT_BASED", displayOrder: 9 },
    { code: "P7", name: "Primary 7", levelNumber: 7, section: "PRIMARY", org: "SUBJECT_BASED", displayOrder: 10 },
    { code: "S1", name: "Senior 1", levelNumber: 1, section: "LOWER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 11 },
    { code: "S2", name: "Senior 2", levelNumber: 2, section: "LOWER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 12 },
    { code: "S3", name: "Senior 3", levelNumber: 3, section: "LOWER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 13 },
    { code: "S4", name: "Senior 4", levelNumber: 4, section: "LOWER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 14 },
    { code: "S5", name: "Senior 5", levelNumber: 5, section: "UPPER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 15 },
    { code: "S6", name: "Senior 6", levelNumber: 6, section: "UPPER_SECONDARY", org: "COMPETENCY_BASED", displayOrder: 16, isTerminal: true },
  ];

  for (const level of levelSeeds) {
    const record = await prisma.academicLevel.upsert({
      where: { schoolId_code: { schoolId: school.id, code: level.code } },
      update: {
        name: level.name,
        levelNumber: level.levelNumber,
        sectionId: sections[level.section].id,
        academicOrganizationId: organizations[level.org].id,
        displayOrder: level.displayOrder,
        isTerminal: level.isTerminal ?? false,
      },
      create: {
        schoolId: school.id,
        code: level.code,
        name: level.name,
        levelNumber: level.levelNumber,
        sectionId: sections[level.section].id,
        academicOrganizationId: organizations[level.org].id,
        displayOrder: level.displayOrder,
        isTerminal: level.isTerminal ?? false,
      },
    });
    levels[level.code] = { id: record.id, name: record.name };
  }

  const progressionSeeds = [
    ["N1", "N2"], ["N2", "N3"], ["N3", "P1"],
    ["P1", "P2"], ["P2", "P3"], ["P3", "P4"], ["P4", "P5"], ["P5", "P6"], ["P6", "P7"],
    ["P7", "S1"], ["S1", "S2"], ["S2", "S3"], ["S3", "S4"], ["S4", "S5"], ["S5", "S6"],
  ];

  for (const [from, to] of progressionSeeds) {
    await prisma.academicLevelProgression.upsert({
      where: {
        schoolId_fromLevelId_toLevelId: {
          schoolId: school.id,
          fromLevelId: levels[from].id,
          toLevelId: levels[to].id,
        },
      },
      update: { isActive: true },
      create: {
        schoolId: school.id,
        fromLevelId: levels[from].id,
        toLevelId: levels[to].id,
        isActive: true,
      },
    });
  }

  const classes: Record<string, { id: string }> = {};
  for (const code of Object.keys(levels)) {
    const level = levels[code];
    const record = await prisma.academicClass.upsert({
      where: { schoolId_code: { schoolId: school.id, code } },
      update: { name: level.name, academicLevelId: level.id },
      create: {
        schoolId: school.id,
        code,
        name: level.name,
        academicLevelId: level.id,
      },
    });
    classes[code] = record;
  }

  const streamSeeds = [
    { classCode: "S2", code: "S2E", name: "S2 East" },
    { classCode: "S2", code: "S2W", name: "S2 West" },
    { classCode: "P5", code: "P5E", name: "P5 East" },
    { classCode: "P5", code: "P5W", name: "P5 West" },
  ];

  const streams: Record<string, { id: string }> = {};

  for (const stream of streamSeeds) {
    const record = await prisma.stream.upsert({
      where: {
        classId_code: { classId: classes[stream.classCode].id, code: stream.code },
      },
      update: { name: stream.name },
      create: {
        classId: classes[stream.classCode].id,
        code: stream.code,
        name: stream.name,
      },
    });
    streams[stream.code] = record;
  }

  const categories: Record<string, { id: string }> = {};
  const categorySeeds = [
    { code: "CORE", name: "Core", displayOrder: 1 },
    { code: "COMPULSORY", name: "Compulsory", displayOrder: 2 },
    { code: "ELECTIVE", name: "Elective", displayOrder: 3 },
    { code: "VOCATIONAL", name: "Vocational", displayOrder: 4 },
    { code: "LANGUAGE", name: "Language", displayOrder: 5 },
    { code: "RELIGIOUS", name: "Religious Education", displayOrder: 6 },
    { code: "SCIENCE", name: "Science", displayOrder: 7 },
    { code: "HUMANITIES", name: "Humanities", displayOrder: 8 },
    { code: "CREATIVE", name: "Creative", displayOrder: 9 },
    { code: "PRACTICAL", name: "Practical", displayOrder: 10 },
  ];

  for (const category of categorySeeds) {
    const record = await prisma.subjectCategory.upsert({
      where: { schoolId_code: { schoolId: school.id, code: category.code } },
      update: { name: category.name, displayOrder: category.displayOrder },
      create: {
        schoolId: school.id,
        code: category.code,
        name: category.name,
        displayOrder: category.displayOrder,
      },
    });
    categories[category.code] = record;
  }

  const subjects: Record<string, { id: string }> = {};
  const subjectSeeds = [
    { code: "MATH", name: "Mathematics", shortName: "Maths", category: "CORE" },
    { code: "ENG", name: "English Language", category: "CORE" },
    { code: "SCI", name: "Integrated Science", category: "COMPULSORY" },
    { code: "SST", name: "Social Studies", category: "COMPULSORY" },
    { code: "BIO", name: "Biology", category: "SCIENCE" },
    { code: "CHEM", name: "Chemistry", category: "SCIENCE" },
    { code: "PHY", name: "Physics", category: "SCIENCE" },
    { code: "ICT", name: "ICT", category: "COMPULSORY" },
    { code: "AGR", name: "Agriculture", category: "VOCATIONAL" },
    { code: "ENT", name: "Entrepreneurship", category: "COMPULSORY" },
    { code: "ECO", name: "Economics", category: "HUMANITIES" },
    { code: "HIS", name: "History", category: "HUMANITIES" },
    { code: "GEO", name: "Geography", category: "HUMANITIES" },
    { code: "LIT", name: "Literature in English", category: "HUMANITIES" },
    { code: "ART", name: "Art and Design", category: "CREATIVE" },
    { code: "PE", name: "Physical Education", category: "PRACTICAL" },
    { code: "FRE", name: "French", category: "LANGUAGE" },
    { code: "LUG", name: "Luganda", category: "LANGUAGE" },
    { code: "CRE", name: "Christian Religious Education", shortName: "CRE", category: "RELIGIOUS" },
    { code: "IRE", name: "Islamic Religious Education", shortName: "IRE", category: "RELIGIOUS" },
  ];

  for (const subject of subjectSeeds) {
    const record = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subject.code } },
      update: {
        name: subject.name,
        shortName: subject.shortName ?? null,
        categoryId: categories[subject.category].id,
      },
      create: {
        schoolId: school.id,
        code: subject.code,
        name: subject.name,
        shortName: subject.shortName ?? null,
        categoryId: categories[subject.category].id,
      },
    });
    subjects[subject.code] = record;
  }

  const offeringSeeds = [
    ["S1", "MATH"], ["S1", "ENG"], ["S1", "SCI"], ["S1", "SST"],
    ["S2", "MATH"], ["S2", "ENG"], ["S2", "SCI"], ["S2", "SST"],
    ["S3", "MATH"], ["S3", "ENG"], ["S3", "BIO"], ["S3", "CHEM"], ["S3", "PHY"],
    ["S4", "MATH"], ["S4", "ENG"], ["S4", "BIO"], ["S4", "CHEM"], ["S4", "PHY"],
    ["S5", "PHY"], ["S5", "CHEM"], ["S5", "BIO"], ["S5", "MATH"], ["S5", "ECO"], ["S5", "GEO"], ["S5", "HIS"], ["S5", "ENT"], ["S5", "LIT"],
    ["S6", "PHY"], ["S6", "CHEM"], ["S6", "BIO"], ["S6", "MATH"], ["S6", "ECO"], ["S6", "GEO"], ["S6", "HIS"], ["S6", "ENT"], ["S6", "LIT"],
  ];

  const offerings: Record<string, { id: string }> = {};

  for (const [levelCode, subjectCode] of offeringSeeds) {
    const record = await prisma.subjectOffering.upsert({
      where: {
        schoolId_subjectId_academicLevelId_academicYearId: {
          schoolId: school.id,
          subjectId: subjects[subjectCode].id,
          academicLevelId: levels[levelCode].id,
          academicYearId: academicYear.id,
        },
      },
      update: { isActive: true },
      create: {
        schoolId: school.id,
        subjectId: subjects[subjectCode].id,
        academicLevelId: levels[levelCode].id,
        academicYearId: academicYear.id,
        isActive: true,
      },
    });
    offerings[`${levelCode}:${subjectCode}`] = record;
  }

  const combinationSeeds = [
    { code: "PCM", name: "Physics, Chemistry and Mathematics", level: "S5", description: "Science combination: Physics, Chemistry and Mathematics", minSubjects: 3, maxSubjects: 3, subjects: ["PHY", "CHEM", "MATH"] },
    { code: "PCB", name: "Physics, Chemistry and Biology", level: "S5", description: "Science combination: Physics, Chemistry and Biology", minSubjects: 3, maxSubjects: 3, subjects: ["PHY", "CHEM", "BIO"] },
    { code: "HEG", name: "History, Economics and Geography", level: "S5", description: "Arts combination: History, Economics and Geography", minSubjects: 3, maxSubjects: 3, subjects: ["HIS", "ECO", "GEO"] },
    { code: "MEG", name: "Mathematics, Economics and Geography", level: "S5", description: "Arts combination: Mathematics, Economics and Geography", minSubjects: 3, maxSubjects: 3, subjects: ["MATH", "ECO", "GEO"] },
  ];

  const combinations: Record<string, { id: string }> = {};

  for (const combination of combinationSeeds) {
    const record = await prisma.subjectCombination.upsert({
      where: { schoolId_code: { schoolId: school.id, code: combination.code } },
      update: {
        name: combination.name,
        description: combination.description,
        academicLevelId: levels[combination.level].id,
        minSubjects: combination.minSubjects,
        maxSubjects: combination.maxSubjects,
      },
      create: {
        schoolId: school.id,
        code: combination.code,
        name: combination.name,
        description: combination.description,
        academicLevelId: levels[combination.level].id,
        minSubjects: combination.minSubjects,
        maxSubjects: combination.maxSubjects,
      },
    });

    combinations[combination.code] = record;

    for (const [index, subjectCode] of combination.subjects.entries()) {
      await prisma.subjectCombinationSubject.upsert({
        where: {
          combinationId_subjectId: {
            combinationId: record.id,
            subjectId: subjects[subjectCode].id,
          },
        },
        update: { isRequired: true, displayOrder: index + 1 },
        create: {
          combinationId: record.id,
          subjectId: subjects[subjectCode].id,
          isRequired: true,
          displayOrder: index + 1,
        },
      });
    }
  }

  console.log("Seeding demonstration school academic operations...");

  const allocationSeeds: Array<[string, string | null, string]> = [
    ["S2", "S2E", "MATH"], ["S2", "S2E", "ENG"], ["S2", "S2E", "SCI"], ["S2", "S2E", "SST"],
    ["S2", "S2W", "MATH"], ["S2", "S2W", "ENG"], ["S2", "S2W", "SCI"], ["S2", "S2W", "SST"],
    ["S5", null, "MATH"], ["S5", null, "PHY"], ["S5", null, "CHEM"], ["S5", null, "BIO"],
    ["S5", null, "ECO"], ["S5", null, "GEO"], ["S5", null, "HIS"], ["S5", null, "ENT"], ["S5", null, "LIT"],
  ];

  for (const [levelCode, streamCode, subjectCode] of allocationSeeds) {
    const classId = classes[levelCode].id;
    const streamId = streamCode ? streams[streamCode].id : null;
    const subjectOfferingId = offerings[`${levelCode}:${subjectCode}`].id;

    const existingAllocation = await prisma.subjectAllocation.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        academicClassId: classId,
        streamId,
        subjectOfferingId,
      },
      select: { id: true },
    });

    if (existingAllocation) {
      await prisma.subjectAllocation.update({
        where: { id: existingAllocation.id },
        data: { isActive: true },
      });
    } else {
      await prisma.subjectAllocation.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          academicClassId: classId,
          streamId,
          subjectOfferingId,
          isActive: true,
        },
      });
    }
  }

  const teachingGroupSeeds: Array<[string, string | null, string, string]> = [
    ["S2", "S2E", "MATH", "S2 East Mathematics"],
    ["S2", "S2W", "MATH", "S2 West Mathematics"],
    ["S5", null, "MATH", "S5 Mathematics"],
    ["S5", null, "PHY", "S5 Physics"],
    ["S5", null, "CHEM", "S5 Chemistry"],
  ];

  for (const [levelCode, streamCode, subjectCode, name] of teachingGroupSeeds) {
    const classId = classes[levelCode].id;
    const streamId = streamCode ? streams[streamCode].id : null;

    const existingGroup = await prisma.teachingGroup.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        academicClassId: classId,
        streamId,
        subjectId: subjects[subjectCode].id,
      },
      select: { id: true },
    });

    if (existingGroup) {
      await prisma.teachingGroup.update({
        where: { id: existingGroup.id },
        data: { name, isActive: true },
      });
    } else {
      await prisma.teachingGroup.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          academicClassId: classId,
          streamId,
          subjectId: subjects[subjectCode].id,
          name,
          isActive: true,
        },
      });
    }
  }

  const demoStudent = await prisma.student.upsert({
    where: {
      schoolId_admissionNumber: {
        schoolId: school.id,
        admissionNumber: "STU-2026-0001",
      },
    },
    update: {
      firstName: "Grace",
      lastName: "Akello",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2008-05-14"),
      status: StudentStatus.ACTIVE,
    },
    create: {
      schoolId: school.id,
      admissionNumber: "STU-2026-0001",
      firstName: "Grace",
      lastName: "Akello",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2008-05-14"),
      status: StudentStatus.ACTIVE,
    },
  });

  const demoEnrollment = await prisma.enrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: demoStudent.id,
        academicYearId: academicYear.id,
      },
    },
    update: {
      academicClassId: classes["S5"].id,
      streamId: null,
      status: EnrollmentStatus.ACTIVE,
      subjectCombinationId: combinations["PCM"].id,
    },
    create: {
      studentId: demoStudent.id,
      academicYearId: academicYear.id,
      academicClassId: classes["S5"].id,
      streamId: null,
      status: EnrollmentStatus.ACTIVE,
      enrollmentDate: new Date("2026-01-15"),
      admissionType: AdmissionType.NEW,
      subjectCombinationId: combinations["PCM"].id,
    },
  });

  for (const subjectCode of ["PHY", "CHEM", "MATH"]) {
    await prisma.studentSubjectEnrollment.upsert({
      where: {
        enrollmentId_subjectId: {
          enrollmentId: demoEnrollment.id,
          subjectId: subjects[subjectCode].id,
        },
      },
      update: { isActive: true },
      create: {
        enrollmentId: demoEnrollment.id,
        subjectId: subjects[subjectCode].id,
        isActive: true,
      },
    });
  }

  console.log("Seeded demonstration school academic operations.");

  console.log("Seeding demonstration school staff configuration...");

  const staffCategorySeeds = [
    { code: "TEACHING", name: "Teaching", displayOrder: 1 },
    { code: "NON_TEACHING", name: "Non-teaching", displayOrder: 2 },
    { code: "ADMINISTRATION", name: "Administration", displayOrder: 3 },
    { code: "SUPPORT", name: "Support", displayOrder: 4 },
  ];

  for (const staffCategory of staffCategorySeeds) {
    await prisma.staffCategory.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: staffCategory.code,
        },
      },
      update: {
        name: staffCategory.name,
        displayOrder: staffCategory.displayOrder,
      },
      create: {
        schoolId: school.id,
        code: staffCategory.code,
        name: staffCategory.name,
        displayOrder: staffCategory.displayOrder,
      },
    });
  }

  const departmentSeeds = [
    { code: "SCIENCE", name: "Science" },
    { code: "HUMANITIES", name: "Humanities" },
    { code: "LANGUAGES", name: "Languages" },
    { code: "MATHEMATICS", name: "Mathematics" },
    { code: "ICT", name: "ICT" },
  ];

  for (const department of departmentSeeds) {
    await prisma.department.upsert({
      where: {
        schoolId_code: { schoolId: school.id, code: department.code },
      },
      update: { name: department.name },
      create: {
        schoolId: school.id,
        code: department.code,
        name: department.name,
      },
    });
  }

  const staffPositionSeeds = [
    { code: "HEAD_TEACHER", name: "Head Teacher" },
    { code: "DEPUTY_HEAD_TEACHER", name: "Deputy Head Teacher" },
    { code: "TEACHER", name: "Teacher" },
    { code: "DIRECTOR_OF_STUDIES", name: "Director of Studies" },
    { code: "HEAD_OF_DEPARTMENT", name: "Head of Department" },
    { code: "CLASS_TEACHER", name: "Class Teacher" },
    { code: "BURSAR", name: "Bursar" },
    { code: "ACCOUNTANT", name: "Accountant" },
    { code: "SECRETARY", name: "Secretary" },
    { code: "LIBRARIAN", name: "Librarian" },
    { code: "NURSE", name: "Nurse" },
    { code: "LABORATORY_ASSISTANT", name: "Laboratory Assistant" },
    { code: "DRIVER", name: "Driver" },
    { code: "CLEANER", name: "Cleaner" },
    { code: "SECURITY_OFFICER", name: "Security Officer" },
    { code: "COOK", name: "Cook" },
    { code: "OTHER", name: "Other" },
  ];

  for (const staffPosition of staffPositionSeeds) {
    await prisma.staffPosition.upsert({
      where: {
        schoolId_code: { schoolId: school.id, code: staffPosition.code },
      },
      update: { name: staffPosition.name },
      create: {
        schoolId: school.id,
        code: staffPosition.code,
        name: staffPosition.name,
      },
    });
  }

  console.log("Seeded demonstration school staff configuration.");

  console.log("Seeding demonstration school assessment and grading configuration...");

  const term = await prisma.term.upsert({
    where: {
      academicYearId_name: { academicYearId: academicYear.id, name: "Term 1" },
    },
    update: { isActive: true },
    create: {
      academicYearId: academicYear.id,
      name: "Term 1",
      startDate: new Date("2026-02-02"),
      endDate: new Date("2026-05-01"),
      isActive: true,
    },
  });

  const gradingScheme = await prisma.gradingScheme.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "LSC-ACH" } },
    update: { name: "Lower Secondary Achievement", isActive: true },
    create: {
      schoolId: school.id,
      code: "LSC-ACH",
      name: "Lower Secondary Achievement",
      description: "Representative 80/60/50/40/20 grade bands for the Uganda lower secondary curriculum.",
      isActive: true,
    },
  });

  const gradingSchemeVersion = await prisma.gradingSchemeVersion.upsert({
    where: {
      gradingSchemeId_versionNumber: { gradingSchemeId: gradingScheme.id, versionNumber: 1 },
    },
    update: { name: "2026 Term 1", status: "ACTIVE" },
    create: {
      gradingSchemeId: gradingScheme.id,
      versionNumber: 1,
      name: "2026 Term 1",
      status: "ACTIVE",
    },
  });

  const gradingBands = [
    { grade: "A", minScore: 80, maxScore: 100, descriptor: "Excellent", achievementLevel: "Outstanding", displayOrder: 1 },
    { grade: "B", minScore: 70, maxScore: 79.99, descriptor: "Very Good", achievementLevel: "Above expectation", displayOrder: 2 },
    { grade: "C", minScore: 60, maxScore: 69.99, descriptor: "Good", achievementLevel: "Meets expectation", displayOrder: 3 },
    { grade: "D", minScore: 50, maxScore: 59.99, descriptor: "Satisfactory", achievementLevel: "Partially meets expectation", displayOrder: 4 },
    { grade: "E", minScore: 20, maxScore: 49.99, descriptor: "Below Satisfactory", achievementLevel: "Below expectation", displayOrder: 5 },
    { grade: "F", minScore: 0, maxScore: 19.99, descriptor: "Failing", achievementLevel: "Requires intervention", displayOrder: 6 },
  ];

  for (const band of gradingBands) {
    const existingBand = await prisma.gradingBand.findFirst({
      where: { versionId: gradingSchemeVersion.id, grade: band.grade },
      select: { id: true },
    });

    if (existingBand) {
      await prisma.gradingBand.update({
        where: { id: existingBand.id },
        data: {
          minScore: band.minScore,
          maxScore: band.maxScore,
          descriptor: band.descriptor,
          achievementLevel: band.achievementLevel,
          displayOrder: band.displayOrder,
        },
      });
    } else {
      await prisma.gradingBand.create({
        data: {
          versionId: gradingSchemeVersion.id,
          ...band,
        },
      });
    }
  }

  const rankingPolicy = await prisma.rankingPolicy.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "CLASS-AVG" } },
    update: {
      name: "Class Average Ranking",
      enabled: true,
      scope: RankingScope.CLASS,
      method: RankingMethod.AVERAGE_SCORE,
      tieHandling: RankingTieHandling.COMPETITION,
      isActive: true,
    },
    create: {
      schoolId: school.id,
      code: "CLASS-AVG",
      name: "Class Average Ranking",
      enabled: true,
      scope: RankingScope.CLASS,
      method: RankingMethod.AVERAGE_SCORE,
      tieHandling: RankingTieHandling.COMPETITION,
      isActive: true,
    },
  });

  const assessmentScheme = await prisma.assessmentScheme.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "LSC-TERM" } },
    update: { name: "Lower Secondary Term Assessment", isActive: true },
    create: {
      schoolId: school.id,
      code: "LSC-TERM",
      name: "Lower Secondary Term Assessment",
      description: "Representative term assessment scheme: 40% continuous assessment and 60% term end examination.",
      isActive: true,
    },
  });

  const assessmentSchemeVersion = await prisma.assessmentSchemeVersion.upsert({
    where: {
      assessmentSchemeId_versionNumber: { assessmentSchemeId: assessmentScheme.id, versionNumber: 1 },
    },
    update: { name: "2026 Term 1", status: "ACTIVE" },
    create: {
      assessmentSchemeId: assessmentScheme.id,
      versionNumber: 1,
      name: "2026 Term 1",
      status: "ACTIVE",
      gradingSchemeVersionId: gradingSchemeVersion.id,
      rankingPolicyId: rankingPolicy.id,
    },
  });

  const schemeComponents = [
    { code: "CA", name: "Continuous Assessment", weight: 40, maxScore: 40, displayOrder: 1 },
    { code: "EXAM", name: "Term End Examination", weight: 60, maxScore: 100, displayOrder: 2 },
  ];

  const schemeComponentIds: Record<string, string> = {};

  for (const component of schemeComponents) {
    const record = await prisma.schemeComponentDefinition.upsert({
      where: {
        schemeVersionId_code: { schemeVersionId: assessmentSchemeVersion.id, code: component.code },
      },
      update: {
        name: component.name,
        weight: component.weight,
        maxScore: component.maxScore,
        displayOrder: component.displayOrder,
      },
      create: {
        schemeVersionId: assessmentSchemeVersion.id,
        ...component,
      },
    });
    schemeComponentIds[component.code] = record.id;
  }

  console.log("Seeded demonstration school assessment and grading configuration.");

  console.log("Seeding demonstration school assessments and results...");

  const s5MathsGroup = await prisma.teachingGroup.findFirst({
    where: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      academicClassId: classes["S5"].id,
      streamId: null,
      subjectId: subjects["MATH"].id,
    },
  });

  if (!s5MathsGroup) {
    throw new Error("S5 Mathematics teaching group not found for assessment demo data.");
  }

  const existingAssessment = await prisma.assessment.findFirst({
    where: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term.id,
      subjectId: subjects["MATH"].id,
      name: "S5 Mathematics Term 1 Examination",
    },
    select: { id: true },
  });

  const demoAssessment = existingAssessment
    ? await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: {
          type: AssessmentType.EXAMINATION,
          status: AssessmentStatus.COMPLETED,
          date: new Date("2026-04-20"),
          teachingGroupId: s5MathsGroup.id,
          schemeVersionId: assessmentSchemeVersion.id,
        },
      })
    : await prisma.assessment.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          termId: term.id,
          subjectId: subjects["MATH"].id,
          academicClassId: classes["S5"].id,
          teachingGroupId: s5MathsGroup.id,
          schemeVersionId: assessmentSchemeVersion.id,
          name: "S5 Mathematics Term 1 Examination",
          code: "S5-MATH-T1",
          type: AssessmentType.EXAMINATION,
          date: new Date("2026-04-20"),
          status: AssessmentStatus.COMPLETED,
        },
      });

  const assessmentComponentIds: Record<string, string> = {};

  for (const component of [
    { code: "CA", name: "Continuous Assessment", weight: 40, maxScore: 40, schemeComponentDefinitionId: schemeComponentIds["CA"] },
    { code: "EXAM", name: "Term End Examination", weight: 60, maxScore: 100, schemeComponentDefinitionId: schemeComponentIds["EXAM"] },
  ]) {
    const record = await prisma.assessmentComponent.upsert({
      where: {
        assessmentId_code: { assessmentId: demoAssessment.id, code: component.code },
      },
      update: {
        name: component.name,
        weight: component.weight,
        maxScore: component.maxScore,
        schemeComponentDefinitionId: component.schemeComponentDefinitionId,
      },
      create: {
        assessmentId: demoAssessment.id,
        ...component,
      },
    });
    assessmentComponentIds[component.code] = record.id;
  }

  const demoScoreSeeds = [
    { componentCode: "CA", score: 32 },
    { componentCode: "EXAM", score: 78.8 },
  ];

  for (const seed of demoScoreSeeds) {
    await prisma.assessmentScore.upsert({
      where: {
        componentId_enrollmentId: {
          componentId: assessmentComponentIds[seed.componentCode],
          enrollmentId: demoEnrollment.id,
        },
      },
      update: {
        score: seed.score,
        status: AssessmentScoreStatus.PRESENT,
      },
      create: {
        assessmentId: demoAssessment.id,
        componentId: assessmentComponentIds[seed.componentCode],
        enrollmentId: demoEnrollment.id,
        score: seed.score,
        status: AssessmentScoreStatus.PRESENT,
      },
    });
  }

  await prisma.learnerResult.upsert({
    where: {
      assessmentId_enrollmentId: {
        assessmentId: demoAssessment.id,
        enrollmentId: demoEnrollment.id,
      },
    },
    update: {
      finalScore: 79.28,
      grade: "B",
      descriptor: "Very Good",
      achievementLevel: "Above expectation",
      status: ResultStatus.APPROVED,
      calculatedAt: new Date("2026-04-25"),
      schemeVersionId: assessmentSchemeVersion.id,
      gradingSchemeVersionId: gradingSchemeVersion.id,
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term.id,
      assessmentId: demoAssessment.id,
      enrollmentId: demoEnrollment.id,
      subjectId: subjects["MATH"].id,
      finalScore: 79.28,
      grade: "B",
      descriptor: "Very Good",
      achievementLevel: "Above expectation",
      status: ResultStatus.APPROVED,
      calculatedAt: new Date("2026-04-25"),
      schemeVersionId: assessmentSchemeVersion.id,
      gradingSchemeVersionId: gradingSchemeVersion.id,
    },
  });

  console.log("Seeded demonstration school assessments and results.");

  console.log("Seeded demonstration school academic structure.");
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });