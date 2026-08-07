import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignRolesRequest, CreateUserRequest, UpdateUserRequest, UserDto } from './models';

/** Client cho /api/admin/users. */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/users`;

  list(search?: string): Observable<UserDto[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<UserDto[]>(this.base, { params });
  }

  create(body: CreateUserRequest): Observable<unknown> {
    return this.http.post(this.base, body);
  }

  update(id: string, body: UpdateUserRequest): Observable<unknown> {
    return this.http.put(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  assignRoles(id: string, body: AssignRolesRequest): Observable<unknown> {
    return this.http.put(`${this.base}/${id}/roles`, body);
  }

  lock(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/lock`, {});
  }

  unlock(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/unlock`, {});
  }
}
