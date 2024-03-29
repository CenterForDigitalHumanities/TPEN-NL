/*
 * Copyright 2011-2013 Saint Louis University. Licensed under the
 *	Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 * 
 * @author Jon Deering
 */
package user;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;

import textdisplay.DatabaseWrapper;

/**
 * Represents a single group of users.
 */
public class Group {

   private String name;
   private int groupID;

   /**
    * Permitted project roles
    */
   public enum roles {
      Leader, Editor, Contributor, Suspended, None
   };

   /**
    * Populate the group based on the group unique id
    *
    * @param id unique id
    * @throws SQLException
    */
   public Group(int id) throws SQLException {
      Connection j = null;
      PreparedStatement ps = null;
      try {
         groupID = id;
         j = DatabaseWrapper.getConnection();

         ps = j.prepareStatement("select * from groups where GID=?");
         ps.setInt(1, id);
         ResultSet rs = ps.executeQuery();
         if (rs.next()) {
            name = rs.getString("name");

         } else {
            groupID = 0;

         }

      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(ps);
      }
   }

   /**
    * Create a new group with the give name, the UID is the id of the creator
    *
    * @param gname name for this group
    * @param uid The user id of the creator of this group
    * @throws SQLException
    */
   public Group(Connection j, String gname, int uid) throws SQLException {
       //System.out.println("Create a new group during create process");
      try (PreparedStatement groupStmt = j.prepareStatement("INSERT INTO groups (name) VALUE (?)", PreparedStatement.RETURN_GENERATED_KEYS)) {
         groupStmt.setString(1, name = gname);
         groupStmt.executeUpdate();

         ResultSet rs = groupStmt.getGeneratedKeys();
         if (rs.next()) {
            groupID = rs.getInt(1);
            
            try (PreparedStatement membersStmt = j.prepareStatement("INSERT INTO groupmembers (UID, GID, role) VALUES (?, ?, ?)")) {
               membersStmt.setInt(1, uid);
               membersStmt.setInt(2, groupID);               
               membersStmt.setString(3, roles.Leader.toString());   // The creator of a group gets leader, otherwise noone else could be invited.
               membersStmt.executeUpdate();
            }
         }
      }
   }
   
   /**
    * Create a new group with the give name, the UID is the id of the creator.
    * For TPEN_NL, only those who used createProject will be a leader that can parse.
    * Those leader can assign additional leaders who can parse
    *
    * @param gname name for this group
    * @param uid The user id of the creator of this group
    * @throws SQLException
    */
   public Group(Connection j, String gname, int uid, boolean nlSupport) throws SQLException {
      // System.out.println("Create a new group during copy process");
      try (PreparedStatement groupStmt = j.prepareStatement("INSERT INTO groups (name) VALUE (?)", PreparedStatement.RETURN_GENERATED_KEYS)) {
         groupStmt.setString(1, name = gname);
         groupStmt.executeUpdate();

         ResultSet rs = groupStmt.getGeneratedKeys();
         if (rs.next()) {
            groupID = rs.getInt(1);
            
            try (PreparedStatement membersStmt = j.prepareStatement("INSERT INTO groupmembers (UID, GID, role) VALUES (?, ?, ?)")) {
               membersStmt.setInt(1, uid);
               membersStmt.setInt(2, groupID);         
               /*
                 * TPEN_NL does not want someone who copied a project to be able to edit it.  
                 * Only creators of master transcriptions (and whoever they promote).
                 * This is handled in GetProjectTPENServlet, LoginHookServlet and User.isAdmin().  The "admin" table of the TPEN database is also involved.
                 * Those pieces determine who those people are on the fly and assign permissions to them appropriately. 
                 * That way, they have control over admins in their user system.  
               */
               // Make a contributor, not an admin.  That way, only the user that created this transcription can see it because they are the only contributor in the group. 
               membersStmt.setString(3, roles.Contributor.toString()); 
               membersStmt.executeUpdate();
            }
         }
      }
   }

   /**
    * get the unique ID for this group
    *
    * @return
    */
   public int getGroupID() {
      return groupID;
   }

   /**
    * Get the name of this group
    *
    * @return
    */
   public String getTitle() {
      return name;
   }

   /**
    * Get all members of the group
    *
    * @return array of all users in this group
    * @throws SQLException
    */
   public User[] getMembers() throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();
          //System.out.println("group ID in group ======== " + this.groupID);
         qry = j.prepareStatement("select * from groupmembers where GID=?");
         qry.setInt(1, groupID);
          //System.out.println("sql ====== " + qry);
         ResultSet rs = qry.executeQuery();
         int recordCount = 0;
         while (rs.next()) {
            recordCount++;
         }
         // System.out.println("member count result count ==== " + recordCount);
         User[] users = new User[recordCount];
         rs.beforeFirst();
         int i = 0;
         while (rs.next()) {
            users[i] = new User(rs.getInt("UID"));
            //System.out.println("find user member id ===== " + rs.getInt("UID") +" with role "+rs.getString("role"));
            i++;
         }
         return users;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * Return all users with the role Group.roles.leader
    *
    * @return array of users who are leaders for this group
    * @throws SQLException
    */
   public User[] getLeader() throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement("select UID from groupmembers where GID=? and role='Leader'");
         qry.setInt(1, groupID);
         ResultSet rs = qry.executeQuery();
         int recordCount = 0;
         while (rs.next()) {
            recordCount++;
         }
         User[] users = new User[recordCount];
         rs.beforeFirst();
         int i = 0;
         while (rs.next()) {
            users[i] = new User(rs.getInt("UID"));
            i++;
         }
         return users;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * getMembersTable is a convenient way to list group members, use getMembers if you need to do something
    * else display wise
    *
    * @return String containing HTML for a table listing all users in the group
    * @throws SQLException
    */
   public String getMembersTable() throws SQLException {
      String toret = "";
      User[] groupmembers = this.getMembers();
      for (int i = 0; i < groupmembers.length; i++) {
         User thisUser = groupmembers[i];
         toret += "<tr><td>" + thisUser.getUID() + "</td><td>" + thisUser.getFname() + thisUser.getLname() + "</td></tr>";
      }
      return toret;
   }

   /**
    * Remove a user from this group
    *
    * @param UID unique identifier of the user to remove from the group
    * @throws SQLException
    */
   public void remove(int UID) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();

         qry = j.prepareStatement("Delete from groupmembers where GID=? and UID=? LIMIT 1", PreparedStatement.RETURN_GENERATED_KEYS);
         qry.setInt(1, groupID);
         qry.setInt(2, UID);
         qry.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * @param identifier email address
    * @return
    */
   public Boolean addMember(String identifier) {
      try {
         Boolean isEmail = true;
         try {
            InternetAddress emailAddr = new InternetAddress(identifier);
            emailAddr.validate();
         } catch (AddressException ex) {
            isEmail = false;
         }
         User u = new User(identifier, isEmail);
         if (u.getUID() > 0) {
            addMember(u.getUID(), Group.roles.Contributor);
            return true;
         }
      } catch (SQLException ex) {
         Logger.getLogger(Group.class.getName()).log(Level.SEVERE, null, ex);
      }
      return false;
   }

   /**
    * Add someone to the group with role Contributor
    *
    * @param UID the unique ID of the user to be added as a contributor
    * @throws SQLException
    */
   public void addMember(int UID) throws SQLException {
      // System.out.println("add member SQL stuff.  GID to be a member of: "+groupID);
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();
         qry = j.prepareStatement("insert into groupmembers (GID,UID,role) values(?,?,?)");
         //System.out.println("groupmembers row add with GID, UID, contributor: "+groupID+", "+UID+", contributor");
         qry.setInt(1, groupID);
         qry.setInt(2, UID);
         qry.setString(3, roles.Contributor.toString());
         qry.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * Add someone to the group with the specified role
    *
    * @param UID unique ID of the user to add
    * @param thisRole the Group.roles to add this user with
    * @throws SQLException
    */
   public void addMember(int UID, roles thisRole) throws SQLException {
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();

         qry = j.prepareStatement("insert into groupmembers (GID,UID,role) values(?,?,?)");
         qry.setInt(1, groupID);
         qry.setInt(2, UID);
         qry.setString(3, thisRole.toString());
         qry.execute();
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * Set someone's role after verifying that the requestor has permission
    *
    * @param requestingUID unique ID of the user attempting to add someone to the group
    * @param targetUID unique id of the user being added to the group
    * @param thisRole Group.roles for the user being added
    * @throws SQLException
    */
   public void setUserRole(int requestingUID, int targetUID, roles thisRole) throws SQLException {
      if (isAdministrator(requestingUID)) {
         Connection j = null;
         PreparedStatement qry = null;
         qry = null;
         try {
            String query = "Update groupmembers set role=? where GID=? and UID=?";
            j = DatabaseWrapper.getConnection();
            qry = j.prepareStatement(query);
            qry.setString(1, thisRole.toString());
            qry.setInt(2, groupID);
            qry.setInt(3, targetUID);
            qry.execute();
         } 
         finally {
            DatabaseWrapper.closeDBConnection(j);
            DatabaseWrapper.closePreparedStatement(qry);
         }
      }
   }

   /**
    * True if the requested UID is a group member, false otherwise
    *
    * @param UID unique id of the user
    * @return true if they are a member of the group, false if they are not
    */
   public Boolean isMember(int UID) {
      try {
          //System.out.println("sample ============== " + UID);
          //System.out.println("memeber len ===== " + this.getMembers().length);
         User[] groupmembers = this.getMembers();
         Boolean t = false;
         for (int i = 0; i < groupmembers.length; i++) {
            User thisUser = groupmembers[i];
            if (thisUser.getUID() == UID) {
               t = true;
            }
         }
         return t;
      } catch (SQLException e) {
         return false;
      }
   }
   
   /**
    * True if the requested lookup is a group member, false otherwise
    *
    * @param lookup uname or email of the user
    * @return true if they are a member of the group, false if they are not
    */
   public Boolean isMember(String lookup) {
      try {
          //System.out.println("sample ============== " + UID);
          //System.out.println("memeber len ===== " + this.getMembers().length);
         //System.out.println("Who are group members...");
         User[] groupmembers = this.getMembers();
         //System.out.println(groupmembers);
         Boolean t = false;
         for (int i = 0; i < groupmembers.length; i++) {
            User thisUser = groupmembers[i];
            //System.out.println("mem user ID ====== " + thisUser.getUID());
            if (thisUser.getUname().equals(lookup) || thisUser.getEmail().equals(lookup)) {
               t = true;
               break;
            }
         }
         return t;
      } catch (SQLException e) {
         return false;
      }
   }

   /**
    * Return the enum item that matches the roles stored in the DB
    *
    * @param UID
    * @return
    * @throws SQLException
    */
   private roles getUserRole(int UID) throws SQLException {
      roles thisRole = roles.None;
      Connection j = null;
      PreparedStatement qry = null;
      qry = null;
      try {
         j = DatabaseWrapper.getConnection();

         qry = j.prepareStatement("select role from groupmembers where UID=? and GID=?");
         qry.setInt(1, UID);
         qry.setInt(2, groupID);
         ResultSet rs = qry.executeQuery();
         if (rs.next()) {
            String roleText = rs.getString(1);
            //Now match the string with the enum
            roles[] allVals = roles.values();
            for (int i = 0; i < allVals.length; i++) {
               if (allVals[i].toString().compareTo(roleText) == 0) {
                  thisRole = allVals[i];
               }
            }
         }
         return thisRole;
      } finally {
         DatabaseWrapper.closeDBConnection(j);
         DatabaseWrapper.closePreparedStatement(qry);
      }
   }

   /**
    * True if the requested UID has admin rights in this group (Groups.roles.Leader), false otherwise. For
    * the moment, only the Leader role gets a true
    *
    * @param UID unique ID of the user in question
    * @return true if they are an admin
    * @throws SQLException
    */
   public Boolean isAdmin(int UID) throws SQLException {
       /*
       BH Note 
       This really acts like an isLeader() check, don't be fooled.  See next function.
       Sometimes this is used to show the string "Leader" next to a name.  
       An admin may not be a Leader, even though they function as one.
       */
      if (getUserRole(UID) == roles.Leader) {
         return true;
      }
      return false;
   }
   
   /**
    * True if the UID is a Leader or in the admins table.  
    * This is to separate leader and admin detection in the class.
    * This function should only be used within this class.  It supplements isAdmin().
    */
   private Boolean isAdministrator(int UID) throws SQLException {
      User u = new User(UID);
      if (u.isAdmin() || getUserRole(UID) == roles.Leader) {
         return true;
      }
      return false;
   }
}
