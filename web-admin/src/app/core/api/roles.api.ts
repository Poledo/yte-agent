import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignPermissionsRequest,
  CreateRoleRequest,
  PermissionGroupDto,
  RoleDto,
  UpdateRoleRequest,
} from './models';

/** Client cho /api/admin/roles và /api/admin/permissions. */
@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/roles`;
  private readonly permBase = `${environment.apiBaseUrl}/api/admin/permissions`;

  list(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.base);
  }

  create(body: CreateRoleRequest): Observable<unknown> {
    return this.http.post(this.base, body);
  }

  update(id: string, body: UpdateRoleRequest): Observable<unknown> {
    return this.http.put(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  assignPermissions(id: string, body: AssignPermissionsRequest): Observable<unknown> {
    return this.http.put(`${this.base}/${id}/permissions`, body);
  }

  listPermissions(): Observable<PermissionGroupDto[]> {
    return this.http.get<PermissionGroupDto[]>(this.permBase);
  }
}
