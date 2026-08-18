import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

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

  for (const stream of streamSeeds) {
    await prisma.stream.upsert({
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

  for (const [levelCode, subjectCode] of offeringSeeds) {
    await prisma.subjectOffering.upsert({
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
  }

  const combinationSeeds = [
    { code: "PCM", name: "Physics, Chemistry and Mathematics", level: "S5", description: "Science combination: Physics, Chemistry and Mathematics", minSubjects: 3, maxSubjects: 3, subjects: ["PHY", "CHEM", "MATH"] },
    { code: "PCB", name: "Physics, Chemistry and Biology", level: "S5", description: "Science combination: Physics, Chemistry and Biology", minSubjects: 3, maxSubjects: 3, subjects: ["PHY", "CHEM", "BIO"] },
    { code: "HEG", name: "History, Economics and Geography", level: "S5", description: "Arts combination: History, Economics and Geography", minSubjects: 3, maxSubjects: 3, subjects: ["HIS", "ECO", "GEO"] },
    { code: "MEG", name: "Mathematics, Economics and Geography", level: "S5", description: "Arts combination: Mathematics, Economics and Geography", minSubjects: 3, maxSubjects: 3, subjects: ["MATH", "ECO", "GEO"] },
  ];

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