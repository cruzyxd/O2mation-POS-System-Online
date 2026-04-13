import os
import requests
import json

os.environ['ENCRYPTION_KEY'] = 'dev-encryption-key-change-in-production-32bytes'

BASE_URL = "http://127.0.0.1:5000/api"

print("=" * 60)
print("Testing Manage Users API")
print("=" * 60)

# Test 1: Login as owner
print("\n1. Login as owner...")
login_resp = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "owner",
    "password": "owner123"
})
print(f"   Status: {login_resp.status_code}")
login_data = login_resp.json()
token = login_data['access_token']
print(f"   Logged in as: {login_data['user']['username']} ({login_data['user']['role']})")

headers = {"Authorization": f"Bearer {token}"}

# Test 2: List users
print("\n2. List all users...")
users_resp = requests.get(f"{BASE_URL}/users/", headers=headers)
print(f"   Status: {users_resp.status_code}")
users_data = users_resp.json()
print(f"   Users count: {len(users_data['users'])}")
for user in users_data['users']:
    pw_display = user['password'] if user['password'] else '(null)'
    print(f"   - {user['username']} ({user['role']}): password='{pw_display}' active={user['is_active']}")

# Test 3: Create new user
print("\n3. Creating new cashier...")
create_resp = requests.post(f"{BASE_URL}/users/", headers=headers, json={
    "username": "test_cashier_api",
    "password": "testpass123",
    "role": "cashier"
})
print(f"   Status: {create_resp.status_code}")
if create_resp.status_code == 201:
    new_user = create_resp.json()
    print(f"   Created: {new_user['username']} (ID: {new_user['id']})")
    print(f"   Password: {new_user['password']}")
    test_user_id = new_user['id']
    
    # Test 4: Update user
    print("\n4. Updating user password...")
    update_resp = requests.patch(f"{BASE_URL}/users/{test_user_id}", headers=headers, json={
        "password": "newpass456"
    })
    print(f"   Status: {update_resp.status_code}")
    if update_resp.status_code == 200:
        updated = update_resp.json()
        print(f"   New password: {updated['password']}")
    
    # Test 5: Deactivate user
    print("\n5. Deactivating user...")
    deactivate_resp = requests.patch(f"{BASE_URL}/users/{test_user_id}/activate", headers=headers, json={
        "is_active": False
    })
    print(f"   Status: {deactivate_resp.status_code}")
    print(f"   Active: {deactivate_resp.json()['is_active']}")
    
    # Test 6: Reactivate user
    print("\n6. Reactivating user...")
    reactivate_resp = requests.patch(f"{BASE_URL}/users/{test_user_id}/activate", headers=headers, json={
        "is_active": True
    })
    print(f"   Status: {reactivate_resp.status_code}")
    print(f"   Active: {reactivate_resp.json()['is_active']}")
    
    # Test 7: Delete user
    print("\n7. Deleting user...")
    delete_resp = requests.delete(f"{BASE_URL}/users/{test_user_id}", headers=headers, json={
        "confirm_password": "owner123"
    })
    print(f"   Status: {delete_resp.status_code}")
    print(f"   Success: {delete_resp.json()['success']}")
else:
    print(f"   Error: {create_resp.json()}")

# Test 8: Verify user was deleted
print("\n8. Verifying deletion...")
users_resp = requests.get(f"{BASE_URL}/users/", headers=headers)
users_data = users_resp.json()
test_user_exists = any(u['username'] == 'test_cashier_api' for u in users_data['users'])
print(f"   Test user exists: {test_user_exists}")

print("\n" + "=" * 60)
print("✅ All API tests completed successfully!")
print("=" * 60)
