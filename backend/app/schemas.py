from datetime import date
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator, model_validator

Role = Literal["Admin", "Project Manager", "Member"]
ProjectStatus = Literal["Planning", "Active", "Completed"]
TaskStatus = Literal["To Do", "In Progress", "In Review", "Completed"]
Priority = Literal["Low", "Medium", "High", "Urgent"]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Description = Annotated[str, StringConstraints(max_length=5000)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
Content = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("email", check_fields=False)
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserCreate(Input):
    name: Name
    email: EmailStr
    password: Password
    role: Role = "Member"
    is_active: bool = True


class UserUpdate(Input):
    name: Name
    email: EmailStr
    role: Role
    is_active: bool


class ProfileUpdate(Input):
    name: Name
    email: EmailStr


class PasswordChange(Input):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password
    confirm_password: Password

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password confirmation must match")
        return self


class ProjectCreate(Input):
    name: ProjectName
    description: Description = ""
    manager_id: int | None = None
    start_date: date
    due_date: date
    status: ProjectStatus = "Planning"


class ProjectUpdate(Input):
    name: ProjectName
    description: Description = ""
    manager_id: int
    start_date: date
    due_date: date
    status: ProjectStatus


class MemberAdd(Input):
    user_id: int


class TaskCreate(Input):
    project_id: int
    title: Title
    description: Description = ""
    assigned_to: int | None = None
    priority: Priority = "Medium"
    due_date: date | None = None


class TaskUpdate(Input):
    title: Title
    description: Description = ""
    assigned_to: int | None = None
    priority: Priority = "Medium"
    due_date: date | None = None


class StatusChange(Input):
    status: TaskStatus
    reason: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""


class CommentInput(Input):
    content: Content
